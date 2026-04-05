import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, "../../uploads");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildStorage(subfolder) {
  return multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(uploadsRoot, subfolder);
      ensureDir(dir);
      cb(null, dir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname || "");
      const safeBase = String(file.originalname || "file")
        .replace(ext, "")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 60);
      const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${safeBase || "file"}-${suffix}${ext}`);
    },
  });
}

function fileFilter(req, file, cb) {
  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowed.includes(file.mimetype)) {
    cb(new Error("Unsupported file type"));
    return;
  }

  cb(null, true);
}

const baseConfig = {
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
};

const ticketUpload = multer({
  storage: buildStorage("tickets"),
  ...baseConfig,
});

const licenseUpload = multer({
  storage: buildStorage("licenses"),
  ...baseConfig,
});

export const uploadTicketFiles = ticketUpload.fields([
  { name: "ticketDocuments", maxCount: 7 },
  { name: "caseResultPdf", maxCount: 1 },
  { name: "paymentSlip", maxCount: 1 },
]);

export const uploadLicenseFiles = licenseUpload.fields([
  { name: "licenseDocuments", maxCount: 5 },
]);
