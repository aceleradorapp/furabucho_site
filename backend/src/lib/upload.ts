import crypto from 'crypto';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', '..', process.env.UPLOADS_DIR ?? 'uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.has(ext)) {
      return cb(new Error('Formato de imagem não suportado'));
    }
    cb(null, true);
  },
});

const videoExt = new Set(['.mp4', '.webm', '.mov']);

export function isVideoFile(filename: string) {
  return videoExt.has(path.extname(filename).toLowerCase());
}

export const postUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.has(ext) && !videoExt.has(ext)) {
      return cb(new Error('Formato não suportado. Use imagem (jpg, png, webp, gif) ou vídeo (mp4, webm, mov) de até 25MB.'));
    }
    cb(null, true);
  },
});
