import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma';

async function main() {
  const admin = await prisma.role.upsert({
    where: { key: 'admin' },
    update: { canManageGallery: true, canManageMemberProfiles: true },
    create: {
      key: 'admin',
      label: 'Administrador',
      canManageUsers: true,
      canManageSettings: true,
      canManagePosts: true,
      canManageGallery: true,
      canManageMemberProfiles: true,
    },
  });

  await prisma.role.upsert({
    where: { key: 'membro_ajudante' },
    update: { canManageMemberProfiles: true },
    create: {
      key: 'membro_ajudante',
      label: 'Membro Ajudante',
      canManageUsers: false,
      canManageSettings: true,
      canManagePosts: true,
      canManageGallery: false,
      canManageMemberProfiles: true,
    },
  });

  await prisma.role.upsert({
    where: { key: 'membro' },
    update: {},
    create: {
      key: 'membro',
      label: 'Membro',
      canManageUsers: false,
      canManageSettings: false,
      canManagePosts: false,
      canManageGallery: false,
    },
  });

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
