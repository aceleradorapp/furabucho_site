/**
 * Roda uma vez, manualmente (`npx ts-node scripts/optimize-existing-uploads.ts`), pra comprimir
 * as imagens que já estão em backend/uploads/ desde antes do serviço automático de otimização
 * existir. Não mexe em vídeos, gifs, nem no fura-bucho.apk.
 */
import fs from 'fs/promises';
import path from 'path';
import { isOptimizableImage, optimizeImageFile } from '../src/lib/imageOptimize';

async function main() {
  const uploadsDir = path.join(__dirname, '..', process.env.UPLOADS_DIR ?? 'uploads');
  const entries = await fs.readdir(uploadsDir);
  const imageFiles = entries.filter((name) => isOptimizableImage(name));

  console.log(`Encontrados ${imageFiles.length} arquivo(s) de imagem em ${uploadsDir}`);

  let totalBefore = 0;
  let totalAfter = 0;
  let changed = 0;

  for (const name of imageFiles) {
    const filePath = path.join(uploadsDir, name);
    const result = await optimizeImageFile(filePath);
    if (!result) continue;

    totalBefore += result.before;
    totalAfter += result.after;
    if (result.after < result.before) {
      changed++;
      const savedKb = ((result.before - result.after) / 1024).toFixed(0);
      console.log(`${name}: ${(result.before / 1024).toFixed(0)}KB -> ${(result.after / 1024).toFixed(0)}KB (economizou ${savedKb}KB)`);
    }
  }

  console.log('---');
  console.log(`Arquivos otimizados: ${changed} de ${imageFiles.length}`);
  console.log(`Tamanho total antes: ${(totalBefore / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Tamanho total depois: ${(totalAfter / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Economia total: ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(2)}MB`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
