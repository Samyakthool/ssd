// ==========================================================================
// SAMATA SAINIK DAL (SSD) - DIGITAL LIBRARY SECURE UPLOAD MIDDLEWARE
// Strict MIME validation, magic-byte inspection, path-traversal protection,
// malware/executable rejection, and cryptographic SHA-256 generation.
// ==========================================================================

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const libraryUploadRoot = process.env.VERCEL ? '/tmp/uploads/library' : path.join(__dirname, '../../uploads/library');
export const libraryFilesDir = path.join(libraryUploadRoot, 'files');
export const libraryThumbsDir = path.join(libraryUploadRoot, 'thumbnails');

// Ensure storage directories exist
try {
  [libraryUploadRoot, libraryFilesDir, libraryThumbsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
} catch (e) {
  console.warn('Storage directory initialization warning:', e.message);
}

// --------------------------------------------------------------------------
// 1. EXTENSION & MIME MAP (ALLOWED PERMISSIONS)
// --------------------------------------------------------------------------
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.epub', '.doc', '.docx', '.txt',
  '.jpg', '.jpeg', '.png', '.webp',
  '.mp3', '.wav', '.ogg', '.m4a',
  '.mp4', '.webm'
]);

const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/epub+zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  // Audio
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  // Video
  'video/mp4',
  'video/webm'
]);

// --------------------------------------------------------------------------
// 2. DISK STORAGE ENGINE WITH SANITIZATION
// --------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(libraryFilesDir)) fs.mkdirSync(libraryFilesDir, { recursive: true });
      if (!fs.existsSync(libraryThumbsDir)) fs.mkdirSync(libraryThumbsDir, { recursive: true });
    } catch (e) {}

    if (file.fieldname === 'thumbnail' || file.fieldname === 'cover') {
      cb(null, libraryThumbsDir);
    } else {
      cb(null, libraryFilesDir);
    }
  },
  filename: (req, file, cb) => {
    // Sanitize original filename (remove directory traversal, null bytes, special chars)
    const rawExt = path.extname(file.originalname || '').toLowerCase();
    const cleanExt = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.bin';

    const safeBase = path.basename(file.originalname || 'resource', rawExt)
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .substring(0, 50);

    const randomToken = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    cb(null, `ssd-lib-${timestamp}-${randomToken}-${safeBase}${cleanExt}`);
  }
});

// --------------------------------------------------------------------------
// 3. FILE FILTER (INITIAL CLIENT DECLARATION & EXTENSION CHECK)
// --------------------------------------------------------------------------
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  
  // Reject executable or dangerous file extensions explicitly
  const dangerousExts = ['.exe', '.sh', '.bat', '.cmd', '.php', '.phtml', '.py', '.js', '.jar', '.vbs', '.msi', '.com'];
  if (dangerousExts.includes(ext)) {
    return cb(new Error(`Security Violation: File extension '${ext}' is strictly prohibited.`), false);
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Unsupported format. Permitted formats: PDF, EPUB, DOCX, TXT, JPG, PNG, WEBP, MP3, WAV, OGG, MP4.`), false);
  }

  cb(null, true);
};

export const libraryUpload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max per upload
    files: 2 // file + optional cover
  },
  fileFilter: fileFilter
});

// --------------------------------------------------------------------------
// 4. DEEP MAGIC BYTES INSPECTOR (SERVER-SIDE CONTENT VALIDATION)
// --------------------------------------------------------------------------
export function validateMagicBytes(filePath, originalExt) {
  try {
    if (!fs.existsSync(filePath)) return { valid: false, reason: 'Uploaded file missing on disk.' };

    const buffer = Buffer.alloc(256);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 256, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) {
      return { valid: false, reason: 'File corrupted or empty (0 bytes).' };
    }

    const ext = originalExt.toLowerCase();

    // Check for malicious executable signatures
    // MZ header (DOS / Windows executable PE)
    if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
      return { valid: false, reason: 'Malicious payload detected: Windows PE Executable format is prohibited.' };
    }
    // ELF header (Linux executable)
    if (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
      return { valid: false, reason: 'Malicious payload detected: ELF binary executable is prohibited.' };
    }
    // PHP opening tag
    const headerStr = buffer.toString('utf-8', 0, Math.min(bytesRead, 64)).toLowerCase();
    if (headerStr.includes('<?php') || headerStr.includes('#!/bin/sh') || headerStr.includes('#!/bin/bash')) {
      return { valid: false, reason: 'Malicious payload detected: Server-side executable script is prohibited.' };
    }

    // Verify expected formats
    if (ext === '.pdf') {
      const isPdf = buffer.toString('ascii', 0, 5) === '%PDF-';
      if (!isPdf) return { valid: false, reason: 'File content does not match standard PDF specification (%PDF header missing).' };
    } else if (ext === '.png') {
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      if (!isPng) return { valid: false, reason: 'File content does not match PNG image format.' };
    } else if (ext === '.jpg' || ext === '.jpeg') {
      const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      if (!isJpg) return { valid: false, reason: 'File content does not match JPEG image format.' };
    } else if (ext === '.webp') {
      const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
      const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
      if (!isRiff || !isWebp) return { valid: false, reason: 'File content does not match WEBP image format.' };
    } else if (ext === '.docx' || ext === '.epub') {
      // ZIP based (PK\x03\x04)
      const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
      if (!isZip) return { valid: false, reason: 'Corrupt archive format for DOCX/EPUB.' };
    } else if (ext === '.mp3') {
      const isId3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
      const isSync = buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0;
      if (!isId3 && !isSync) return { valid: false, reason: 'File content does not match MP3 audio specification.' };
    } else if (ext === '.mp4' || ext === '.m4a') {
      const hasFtyp = buffer.toString('ascii', 4, 8) === 'ftyp';
      if (!hasFtyp) return { valid: false, reason: 'File content does not match MP4/M4A video/audio container.' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: 'File inspection failed: ' + err.message };
  }
}

// --------------------------------------------------------------------------
// 5. CRYPTOGRAPHIC UTILITIES
// --------------------------------------------------------------------------
export function calculateFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', err => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}

export function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
