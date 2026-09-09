import { Prisma, PrismaClient } from "@prisma/client";
import { getStorageProvider } from "../../services/storage";

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface RecordDocumentInput {
  type: string; // AGREEMENT, INVOICE, RECEIPT, EARNINGS_STATEMENT, REFUND, SHIPPING, EVIDENCE_PACK
  ownerUserId: string;
  campaignId?: string;
  assignmentId?: string;
  objectKey: string;
  hash: string;
  createdBy?: string;
}

/**
 * Every generated artifact (agreement PDF today; invoices/receipts/
 * shipping docs in future slices) gets one row here. The Evidence
 * Vault (spec §37) IS this table, viewed per-campaign and grouped by
 * `type` — there's no separate vault data structure to keep in sync.
 */
export async function recordDocument(db: DbClient, input: RecordDocumentInput) {
  return db.document.create({
    data: {
      type: input.type,
      ownerUserId: input.ownerUserId,
      campaignId: input.campaignId,
      assignmentId: input.assignmentId,
      objectKey: input.objectKey,
      hash: input.hash,
      createdBy: input.createdBy,
    },
  });
}

export async function listDocumentsForCampaign(prisma: PrismaClient, campaignId: string) {
  const documents = await prisma.document.findMany({ where: { campaignId }, orderBy: { createdAt: "desc" } });
  const storage = getStorageProvider();
  return Promise.all(
    documents.map(async (doc) => ({ ...doc, downloadUrl: await storage.getSignedDownloadUrl(doc.objectKey) }))
  );
}

/**
 * "Generate complete evidence pack" (spec §37) as a JSON manifest of
 * every document for a campaign, each with a fresh signed URL — not
 * an actual zip file (no archiving library is wired up in this
 * build). An admin/brand downloads each link individually; bundling
 * them into one archive is a follow-up, not a functional gap in what
 * evidence is available.
 */
export async function generateEvidencePack(prisma: PrismaClient, campaignId: string) {
  const documents = await listDocumentsForCampaign(prisma, campaignId);
  const grouped: Record<string, typeof documents> = {};
  for (const doc of documents) {
    (grouped[doc.type] ??= []).push(doc);
  }
  return { campaignId, generatedAt: new Date().toISOString(), totalDocuments: documents.length, byType: grouped };
}
