import fs from 'fs/promises';
import path from 'path';
import type Sharp from 'sharp';

// Carregado sob demanda (nao com "import" estatico) porque o sharp exige Node >=20.9 --
// em servidores ainda no Node 18, o require falha e cai no catch, deixando a otimizacao
// desativada em vez de derrubar o processo inteiro na inicializacao.
let sharp: typeof Sharp | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  sharp = require('sharp');
} catch (err) {
  console.error('Modulo sharp indisponivel nesse ambiente -- otimizacao de imagem desativada, uploads continuam sem compressao.', err);
}

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
  if (!sharp || !isOptimizableImage(filePath)) return null;

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
