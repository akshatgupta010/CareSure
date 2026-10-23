import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

// Ensure upload directory exists
const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate secure randomized filename to prevent path traversal or overwrites
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomName}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.csv',
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
]);

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new AppError(
          'UNSUPPORTED_FILE',
          400,
          `File type ${ext} (${file.mimetype}) is not supported. Allowed: .csv, .pdf, .png, .jpg`
        )
      );
    }
    cb(null, true);
  },
});
