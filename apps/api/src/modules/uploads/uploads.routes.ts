import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { sendSuccess } from "../../lib/apiResponse";
import { ValidationError } from "../../lib/errors";
import { assertAllowedUpload, getStorageProvider, MAX_UPLOAD_BYTES } from "../../services/storage";

const router = Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

// Known upload purposes map to storage key prefixes (spec §62's
// bucket layout: campaign-assets/, creator-submissions/, screenshots/,
// payment-proofs/, evidence/ ...). Keeping this as an allowlist means
// a caller can never write outside the intended folder.
const PURPOSE_PREFIXES: Record<string, string> = {
  "post-screenshot": "screenshots",
  "creator-content": "creator-submissions", // Creator Content / Product Review video/photo submissions
  "campaign-asset": "campaign-assets", // Clipping source video the brand supplies (spec §19 step 02, §20)
  "shipment-proof": "shipping",
  "kyc-document": "evidence",
  "withdrawal-proof": "payment-proofs",
};

const QuerySchema = z.object({
  purpose: z.enum([
    "post-screenshot",
    "creator-content",
    "campaign-asset",
    "shipment-proof",
    "kyc-document",
    "withdrawal-proof",
  ]),
});

router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ValidationError("No file provided (expected multipart field 'file')");
    const { purpose } = QuerySchema.parse(req.query);

    assertAllowedUpload(req.file.mimetype, req.file.size);

    const key = `${PURPOSE_PREFIXES[purpose]}/${req.auth!.sub}/${Date.now()}-${crypto.randomUUID()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await getStorageProvider().putObject({ key, body: req.file.buffer, contentType: req.file.mimetype });

    sendSuccess(res, { key }, "File uploaded.", 201);
  })
);

export default router;
