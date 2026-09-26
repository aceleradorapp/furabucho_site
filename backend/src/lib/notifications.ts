import { prisma } from './prisma';
import { enviarPush } from './push';

interface NotificarParams {
  /** Quem recebe o aviso */
  userId: number;
  /** Quem provocou (deixe vazio em avisos do sistema, tipo aniversario) */
  actorId?: number;
  type: string;
  message: string;
  /** Rota interna pra onde o aviso leva, ex: /feed */
  link?: string;
}

/**
 * Cria um aviso pessoal. Nunca notifica a propria pessoa sobre o que ela mesma fez, e nunca
 * derruba a acao principal se falhar -- curtir um post tem que funcionar mesmo que o aviso nao
 * consiga ser gravado.
 */
export async function notificar({ userId, actorId, type, message, link }: NotificarParams) {
  if (actorId && actorId === userId) return;

  try {
    await prisma.notification.create({
      data: { userId, actorId: actorId ?? null, type, message, link: link ?? null },
    });
  } catch (err) {
    console.error('Falha ao criar notificação:', err);
    return;
  }

  // O aviso dentro do app ja esta salvo. O push e o mesmo aviso chegando no celular com o app
  // fechado -- se falhar, a pessoa ainda ve tudo no sino. Por isso ele nunca derruba nada.
  try {
    await enviarPush(userId, { titulo: 'Amigos Fura-Bucho', corpo: message, link, tag: type });
  } catch (err) {
    console.error('Falha ao enviar push:', err);
  }
}

export function nomeExibicao(user: { name: string; nickname: string | null }) {
  return user.nickname || user.name;
}
