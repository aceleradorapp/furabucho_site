import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 82;
const PNG_QUALITY = 82;
const WEBP_QUALITY = 82;

const OPTIMIZABLE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function isOptimizableImage(filename: string) {
  return OPTIMIZABLE_EXT.has(path.extname(filename).toLowerCase());
}

/** Redimensiona (só encolhe, nunca aumenta) e recomprime uma imagem já salva em disco,
 * mantendo o mesmo formato (pra não quebrar a extensão do arquivo). Gifs e formatos fora da
 * lista não são tocados. Se por algum motivo o resultado não ficar menor, mantém o original. */
export async function optimizeImageFile(filePath: string): Promise<{ before: number; after: number } | null> {
  if (!isOptimizableImage(filePath)) return null;

  try {
    const original = await fs.readFile(filePath);
    const beforeSize = original.length;
    const ext = path.extname(filePath).toLowerCase();

    let pipeline = sharp(original, { failOn: 'none' }).resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });

    if (ext === '.png') {
      pipeline = pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9 });
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({ quality: WEBP_QUALITY });
    } else {
      pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    }

    const optimized = await pipeline.toBuffer();

    if (optimized.length >= beforeSize) {
      return { before: beforeSize, after: beforeSize };
    }

    await fs.writeFile(filePath, optimized);
    return { before: beforeSize, after: optimized.length };
  } catch (err) {
    console.error(`Falha ao otimizar imagem ${filePath}:`, err);
    return null;
  }
}
