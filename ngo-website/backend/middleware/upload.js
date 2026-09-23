// ==========================================================================
// SAMATA SAINIK DAL (SSD) - SECURE FILE UPLOAD MIDDLEWARE
// ==========================================================================

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadRoot = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../../uploads');
const photoDir = path.join(uploadRoot, 'photos');
const docDir = path.join(uploadRoot, 'documents');

try {
  [uploadRoot, photoDir, docDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
} catch (e) {}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });
      if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });
    } catch (e) {}
    if (file.fieldname === 'photo') {
      cb(null, photoDir);
    } else {
      cb(null, docDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext) ? ext : '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${cleanExt}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPG, PNG, WEBP, and PDF documents are allowed.'), false);
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});
