import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AvailabilityStatus, PrismaClient } from "@prisma/client";
import { decideKyc, getKycRecordForAdmin, submitKyc } from "../src/modules/kyc/kyc.service";

const prisma = new PrismaClient();

async function makeCreator() {
  const user = await prisma.user.create({
    data: { email: `creator-${Date.now()}-${Math.random()}@test.dev`, passwordHash: "x", status: "ACTIVE" },
  });
  return prisma.creator.create({
    data: { userId: user.id, fullName: "Test Creator", displayName: "tc", availability: AvailabilityStatus.AVAILABLE },
  });
}

describe("KYC submission + review (spec §35) — siloed from brands", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("submits KYC and encrypts the document number at rest", async () => {
    const creator = await makeCreator();
    await submitKyc(prisma, creator.id, { documentType: "PAN", documentNumber: "ABCDE1234F", documentKey: "evidence/x/doc.jpg" });

    const raw = await prisma.kycRecord.findFirstOrThrow({ where: { creatorId: creator.id } });
    expect(raw.documentNumberEncrypted).not.toContain("ABCDE1234F");

    const updatedCreator = await prisma.creator.findUniqueOrThrow({ where: { id: creator.id } });
    expect(updatedCreator.kycStatus).toBe("SUBMITTED");
  });

  it("rejects a second submission while one is already pending", async () => {
    const creator = await makeCreator();
    await submitKyc(prisma, creator.id, { documentType: "PAN", documentNumber: "ABCDE1234F", documentKey: "evidence/x/doc.jpg" });
    await expect(
      submitKyc(prisma, creator.id, { documentType: "PAN", documentNumber: "ABCDE1234F", documentKey: "evidence/x/doc2.jpg" })
    ).rejects.toThrow(/cannot be submitted/);
  });

  it("an admin can verify a submission, and the creator's status reflects it", async () => {
    const creator = await makeCreator();
    const record = await submitKyc(prisma, creator.id, { documentType: "AADHAAR", documentNumber: "123412341234", documentKey: "evidence/x/aadhaar.jpg" });

    const decided = await decideKyc(prisma, record.id, "admin-1", "VERIFIED");
    expect(decided.status).toBe("VERIFIED");

    const updatedCreator = await prisma.creator.findUniqueOrThrow({ where: { id: creator.id } });
    expect(updatedCreator.kycStatus).toBe("VERIFIED");
  });

  it("resubmission_required allows the creator to submit again", async () => {
    const creator = await makeCreator();
    const record = await submitKyc(prisma, creator.id, { documentType: "PAN", documentNumber: "ABCDE1234F", documentKey: "evidence/x/doc.jpg" });
    await decideKyc(prisma, record.id, "admin-1", "RESUBMISSION_REQUIRED", "Document is blurry");

    const resubmitted = await submitKyc(prisma, creator.id, { documentType: "PAN", documentNumber: "ABCDE1234F", documentKey: "evidence/x/doc-clear.jpg" });
    expect(resubmitted).toBeTruthy();
  });

  it("the admin detail view decrypts the document number; the list/status views never do", async () => {
    const creator = await makeCreator();
    const record = await submitKyc(prisma, creator.id, { documentType: "PAN", documentNumber: "ZZZZZ9999Z", documentKey: "evidence/x/doc.jpg" });

    expect((record as { documentNumber?: string }).documentNumber).toBeUndefined();

    const detail = await getKycRecordForAdmin(prisma, record.id);
    expect(detail.documentNumber).toBe("ZZZZZ9999Z");
  });
});
