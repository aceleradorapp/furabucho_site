import { Router } from 'express';
import { chavePublica, enviarPush, pushConfigurado } from '../lib/push';
import { prisma } from '../lib/prisma';
import { AuthedRequest, requireAuth } from '../middleware/auth';

export const pushRouter = Router();

/** Público de propósito: a chave pública é feita pra ficar exposta no navegador. */
pushRouter.get('/chave-publica', (_req, res) => {
  res.json({ chave: chavePublica(), ativo: pushConfigurado });
});

pushRouter.use(requireAuth);

interface CorpoInscricao {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

pushRouter.post('/inscrever', async (req: AuthedRequest, res) => {
  const { endpoint, keys } = req.body as CorpoInscricao;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Inscrição incompleta' });
  }

  // O mesmo aparelho pode se reinscrever (reinstalou, limpou dados, trocou de conta no mesmo
  // celular). Como o endpoint é único, o upsert atualiza em vez de duplicar -- e o userId é
  // reescrito, senão o aviso continuaria indo pro dono anterior daquele aparelho.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: req.userId as number, p256dh: keys.p256dh, auth: keys.auth },
    create: {
      userId: req.userId as number,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: req.get('user-agent') ?? null,
    },
  });

  res.status(201).json({ ok: true });
});

pushRouter.post('/desinscrever', async (req: AuthedRequest, res) => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) return res.status(400).json({ error: 'Informe o endpoint' });

  // Filtra pelo dono junto: ninguém desliga o aviso do aparelho de outra pessoa.
  const r = await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.userId } });
  res.json({ ok: true, removidas: r.count });
});

/** Quantos aparelhos meus estão recebendo — usado pra tela saber o que mostrar. */
pushRouter.get('/status', async (req: AuthedRequest, res) => {
  const aparelhos = await prisma.pushSubscription.count({ where: { userId: req.userId } });
  res.json({ aparelhos, ativo: pushConfigurado });
});

/** Manda um aviso de teste pros próprios aparelhos — só pra pessoa conferir que funciona. */
pushRouter.post('/testar', async (req: AuthedRequest, res) => {
  const r = await enviarPush(req.userId as number, {
    titulo: 'Amigos Fura-Bucho',
    corpo: 'Deu certo! É assim que os avisos vão chegar.',
    link: '/feed',
    tag: 'teste',
  });
  res.json(r);
});
