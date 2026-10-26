import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const uploadDir = path.resolve(here, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// Address of this backend, used to build the public link stored in MongoDB for each uploaded photo.
export const publicBaseUrl = () =>
  (process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, "");

const EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    // Random server-chosen name: the original filename is never used on disk.
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${EXTENSIONS[file.mimetype]}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) =>
    EXTENSIONS[file.mimetype] ? cb(null, true) : cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed."))
}).array("images", 8);

// Wraps multer so upload problems come back as a clean 400 instead of a 500.
export function uploadProductImages(req, res, next) {
  upload(req, res, err => {
    if (!err) return next();
    let message = err.message;
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") message = "Each image must be 5 MB or smaller.";
      else if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") message = "You can upload up to 8 images.";
    }
    res.status(400).json({ message });
  });
}
