/**
 * Creates (or promotes) a Super Admin account.
 *
 * There's no self-serve way to become an admin — signup only ever
 * grants BRAND or CREATOR — so onboarding the very first admin, or
 * adding another one later, needs a real operational tool rather than
 * a one-off hand-edit of the database. Idempotent: re-running it for
 * an existing email updates the name/password and makes sure the
 * SUPER_ADMIN role is attached, rather than failing on a duplicate.
 *
 * Usage: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=... ADMIN_NAME="Your Name" npx ts-node src/create-admin.ts
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { Role } from "@antigravity/shared";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (ADMIN_NAME is optional) before running this script.");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const role = await prisma.role.findUniqueOrThrow({ where: { name: Role.SUPER_ADMIN } });
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: name ?? undefined, status: "ACTIVE", emailVerifiedAt: new Date() },
    create: {
      email,
      name,
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  console.log(`Super Admin ready: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
