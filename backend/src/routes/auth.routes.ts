import bcrypt from 'bcrypt';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { computeEffectivePermissions } from '../lib/permissions';
import { prisma } from '../lib/prisma';
import { SENHA_PADRAO } from '../lib/senha';
import { AuthedRequest, requireAuth } from '../middleware/auth';

export const authRouter = Router();

function serializeUser(user: {
  id: number;
  name: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  birthDate: Date | null;
  mustChangePassword: boolean;
  welcomeSeenAt: Date | null;
  isPontaFirme: boolean;
  isVeterano: boolean;
  role: {
    key: string;
    label: string;
    dailyPostLimit: number;
    permissions: { key: string; value: boolean }[];
  };
  permissionOverrides: { key: string; value: boolean }[];
}) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    birthDate: user.birthDate,
    mustChangePassword: user.mustChangePassword,
    welcomeSeen: !!user.welcomeSeenAt,
    isPontaFirme: user.isPontaFirme,
    isVeterano: user.isVeterano,
    role: user.role.key,
    roleLabel: user.role.label,
    dailyPostLimit: user.role.dailyPostLimit,
    permissions: computeEffectivePermissions(user.role.key, user.role.permissions, user.permissionOverrides),
  };
}

const userInclude = { role: { include: { permissions: true } }, permissionOverrides: true } as const;

// Espelha a mascara (DD)numero usada no cadastro, pra reconhecer o telefone no login
// independente de a pessoa digitar com ou sem os parenteses.
function formatPhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  return `(${digits.slice(0, 2)})${digits.slice(2)}`;
}

authRouter.post('/login', async (req, res) => {
  const { identifier, password } = req.body as { identifier?: string; password?: string };

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Informe usuário, e-mail ou WhatsApp e senha' });
  }

  const trimmed = identifier.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: trimmed.toLowerCase() },
        { username: trimmed },
        { whatsapp: trimmed },
        { whatsapp: formatPhoneBR(trimmed) },
      ],
    },
    include: userInclude,
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // So obriga a trocar quem nao escolheu a propria senha: ou a flag do banco diz isso (cadastro
  // feito pelo admin, com senha temporaria), ou a pessoa esta literalmente com a senha padrao.
  // Quem veio dos Pioneiros entra com a senha que ja usava e nao e incomodado.
  // O login e o unico ponto onde temos a senha em texto puro, entao e aqui que a flag se
  // corrige -- dai o /me e o resto do app enxergam o valor certo.
  const precisaTrocarSenha = user.mustChangePassword || password === SENHA_PADRAO;
  if (precisaTrocarSenha !== user.mustChangePassword) {
    await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: precisaTrocarSenha } });
    user.mustChangePassword = precisaTrocarSenha;
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string);

  res.json({ token, user: serializeUser(user) });
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, include: userInclude });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ user: serializeUser(user) });
});

// Marca que a pessoa ja passou pelas boas-vindas. Idempotente de proposito: se ela clicar duas
// vezes ou voltar na tela, nao muda a data original nem quebra nada.
authRouter.post('/welcome-seen', requireAuth, async (req: AuthedRequest, res) => {
  await prisma.user.updateMany({
    where: { id: req.userId, welcomeSeenAt: null },
    data: { welcomeSeenAt: new Date() },
  });
  res.json({ ok: true });
});

authRouter.post('/change-password', requireAuth, async (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!newPassword) {
    return res.status(400).json({ error: 'Informe a nova senha' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter ao menos 6 caracteres' });
  }
  if (newPassword === SENHA_PADRAO) {
    return res.status(400).json({ error: 'Escolha uma senha diferente da senha padrão' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  // No primeiro acesso a pessoa esta com uma senha que nao foi ela que escolheu -- pedir pra
  // digitar essa senha de novo e so atrito. Fora desse caso a troca e voluntaria, e ai a senha
  // atual continua obrigatoria: sem isso, quem pegasse a sessao aberta trocaria a senha sozinho.
  if (!user.mustChangePassword) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  res.json({ ok: true });
});
