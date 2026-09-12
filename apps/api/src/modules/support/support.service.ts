import { PrismaClient } from "@prisma/client";
import { NotFoundError, UnauthorizedError } from "../../lib/errors";
import type { CreateTicketInput } from "./support.validation";

const TICKET_LIST_SELECT = {
  id: true,
  subject: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { messages: true } },
} as const;

/** The ticket's own `description` is also inserted as the first
 * message in its thread — one source of truth for "what did they
 * actually say," so the detail view's thread naturally opens with it
 * instead of showing the description separately from message #1. */
export async function createTicket(prisma: PrismaClient, userId: string, input: CreateTicketInput) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: { userId, subject: input.subject, description: input.description, priority: input.priority },
    });
    await tx.supportTicketMessage.create({
      data: { ticketId: ticket.id, senderId: userId, senderRole: "USER", body: input.description },
    });
    return ticket;
  });
}

export async function listMyTickets(prisma: PrismaClient, userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: TICKET_LIST_SELECT,
  });
}

async function loadTicket(prisma: PrismaClient, ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) throw new NotFoundError("Support ticket not found");
  return ticket;
}

export async function getMyTicket(prisma: PrismaClient, userId: string, ticketId: string) {
  const ticket = await loadTicket(prisma, ticketId);
  if (ticket.userId !== userId) throw new UnauthorizedError();
  return ticket;
}

export async function getTicketForAdmin(prisma: PrismaClient, ticketId: string) {
  const ticket = await loadTicket(prisma, ticketId);
  const user = await prisma.user.findUnique({ where: { id: ticket.userId }, select: { email: true, name: true } });
  return { ...ticket, user };
}

/** A user replying to a RESOLVED/CLOSED ticket reopens it — "still not
 * fixed" is exactly what a reply after resolution means. */
export async function addUserMessage(prisma: PrismaClient, userId: string, ticketId: string, body: string) {
  const ticket = await loadTicket(prisma, ticketId);
  if (ticket.userId !== userId) throw new UnauthorizedError();
  return prisma.$transaction(async (tx) => {
    const message = await tx.supportTicketMessage.create({
      data: { ticketId, senderId: userId, senderRole: "USER", body },
    });
    const nextStatus = ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "OPEN" : ticket.status;
    await tx.supportTicket.update({ where: { id: ticketId }, data: { status: nextStatus } });
    return message;
  });
}

/** Support replying moves a fresh ticket into IN_PROGRESS — it's
 * being worked on now, not just sitting unread. */
export async function addAdminMessage(prisma: PrismaClient, adminId: string, ticketId: string, body: string) {
  const ticket = await loadTicket(prisma, ticketId);
  return prisma.$transaction(async (tx) => {
    const message = await tx.supportTicketMessage.create({
      data: { ticketId, senderId: adminId, senderRole: "ADMIN", body },
    });
    const nextStatus = ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status;
    await tx.supportTicket.update({ where: { id: ticketId }, data: { status: nextStatus } });
    return message;
  });
}

export async function listAllTickets(prisma: PrismaClient) {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { updatedAt: "desc" },
    select: { ...TICKET_LIST_SELECT, userId: true },
  });
  const userIds = Array.from(new Set(tickets.map((t) => t.userId)));
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, name: true } });
  const userById = new Map(users.map((u) => [u.id, u]));
  return tickets.map((t) => ({ ...t, user: userById.get(t.userId) ?? null }));
}

export async function updateTicketStatus(prisma: PrismaClient, ticketId: string, status: string) {
  await loadTicket(prisma, ticketId);
  return prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
}
