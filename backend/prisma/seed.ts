import bcrypt from 'bcrypt';
import { ALL_PERMISSION_KEYS } from '../src/lib/permissions';
import { prisma } from '../src/lib/prisma';

const ROLE_PERMISSION_DEFAULTS: Record<string, Record<string, boolean>> = {
  admin: Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, true])),
  membro_ajudante: {
    'members.view': true,
    'members.create': false,
    'members.editProfile': true,
    'members.changeRole': false,
    'members.delete': true,
    'settings.edit': true,
    'gallery.manage': false,
    'feed.create': true,
    'feed.moderate': false,
    'announcements.manage': true,
  },
  membro: Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, false])),
};

async function upsertRole(key: string, label: string) {
  const role = await prisma.role.upsert({
    where: { key },
    update: { label },
    create: { key, label },
  });

  const defaults = ROLE_PERMISSION_DEFAULTS[key] ?? {};
  for (const permissionKey of ALL_PERMISSION_KEYS) {
    const value = defaults[permissionKey] ?? false;
    await prisma.rolePermission.upsert({
      where: { roleId_key: { roleId: role.id, key: permissionKey } },
      update: {},
      create: { roleId: role.id, key: permissionKey, value },
    });
  }

  return role;
}

async function main() {
  const admin = await upsertRole('admin', 'Administrador');
  await upsertRole('membro_ajudante', 'Membro Ajudante');
  await upsertRole('membro', 'Membro');

  const passwordHash = await bcrypt.hash('mm230475', 10);

  await prisma.user.upsert({
    where: { email: 'michael.elointer@gmail.com' },
    update: {},
    create: {
      name: 'Michael',
      username: 'michael.elointer',
      email: 'michael.elointer@gmail.com',
      passwordHash,
      roleId: admin.id,
      mustChangePassword: false,
    },
  });

  const settingsCount = await prisma.siteSettings.count();
  if (settingsCount === 0) {
    await prisma.siteSettings.create({
      data: {
        siteName: 'Amigos Fura-Bucho',
        subtitle: 'Desde sempre • Tradição & Família',
        heroTitle: 'TRADIÇÃO, RISADAS & UNIÃO',
      },
    });
  }

  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
