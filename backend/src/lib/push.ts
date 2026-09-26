import webpush from 'web-push';
import { prisma } from './prisma';

/**
 * Envio de aviso pro celular com o app fechado (Web Push).
 *
 * Nao existe servico contratado no meio: as chaves VAPID provam que o aviso saiu deste
 * servidor, e os servicos de push dos proprios navegadores (Google, Mozilla, Apple) entregam
 * de graca. Por isso nao ha cadastro nem custo por mensagem.
 */

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:contato@friendsface.com.br';

export const pushConfigurado = Boolean(PUBLIC_KEY && PRIVATE_KEY);

if (pushConfigurado) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY as string, PRIVATE_KEY as string);
} else {
  console.warn('Push desligado: VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não estão no .env');
}

export function chavePublica() {
  return PUBLIC_KEY ?? null;
}

interface AvisoPush {
  titulo: string;
  corpo: string;
  link?: string;
  /** Agrupa avisos parecidos: um novo com a mesma tag substitui o anterior na tela. */
  tag?: string;
}

/**
 * Manda o aviso pra todos os aparelhos da pessoa. Nunca lanca excecao: push e um extra, e
 * falhar nele nao pode derrubar a acao que o gerou (curtir, comentar, mandar bilhetinho).
 */
export async function enviarPush(userId: number, aviso: AvisoPush) {
  if (!pushConfigurado) return { enviados: 0, removidos: 0 };

  const inscricoes = await prisma.pushSubscription.findMany({ where: { userId } });
  if (inscricoes.length === 0) return { enviados: 0, removidos: 0 };

  const payload = JSON.stringify({
    title: aviso.titulo,
    body: aviso.corpo,
    link: aviso.link ?? '/feed',
    tag: aviso.tag,
  });

  let enviados = 0;
  const mortas: number[] = [];

  await Promise.all(
    inscricoes.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        enviados++;
      } catch (err) {
        // 404/410 = a inscricao morreu pra sempre (app desinstalado, dados limpos, aparelho
        // trocado). Guardar ela so faria o servidor tentar entregar pra fantasma toda vez.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) mortas.push(s.id);
        else console.error('Falha ao enviar push:', status, (err as Error).message);
      }
    }),
  );

  if (mortas.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: mortas } } });
  }

  return { enviados, removidos: mortas.length };
}
