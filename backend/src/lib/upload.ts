import crypto from 'crypto';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { optimizeImageFile } from './imageOptimize';

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

function collectUploadedFiles(req: Request): Express.Multer.File[] {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') {
    return Object.values(req.files).flat();
  }
  return [];
}

// Envolve qualquer middleware do multer (single/array/fields) pra, depois do upload salvar o
// arquivo em disco, otimizar automaticamente cada imagem recebida -- sem precisar mexer em
// nenhuma rota. É esse envolvimento que faz de `upload`/`postUpload` um "serviço" único de
// compressão, valendo pra qualquer tela que suba imagem hoje ou no futuro.
function withImageOptimization(middleware: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (err: unknown) => {
      if (err) return next(err);
      const files = collectUploadedFiles(req);
      Promise.all(files.map((f) => optimizeImageFile(f.path)))
        .then(() => next())
        .catch(next);
    });
  };
}

const imageMulter = multer({
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

export const upload = {
  single: (field: string): RequestHandler => withImageOptimization(imageMulter.single(field)),
  array: (field: string, maxCount?: number): RequestHandler =>
    withImageOptimization(imageMulter.array(field, maxCount)),
  fields: (fields: multer.Field[]): RequestHandler => withImageOptimization(imageMulter.fields(fields)),
};

const videoExt = new Set(['.mp4', '.webm', '.mov']);

export function isVideoFile(filename: string) {
  return videoExt.has(path.extname(filename).toLowerCase());
}

const postMulter = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.has(ext) && !videoExt.has(ext)) {
      return cb(new Error('Formato não suportado. Use imagem (jpg, png, webp, gif) ou vídeo (mp4, webm, mov) de até 10MB.'));
    }
    cb(null, true);
  },
});

export const postUpload = {
  single: (field: string): RequestHandler => withImageOptimization(postMulter.single(field)),
};
