export interface PermissionAction {
  key: string;
  label: string;
}

export interface PermissionCategory {
  key: string;
  label: string;
  actions: PermissionAction[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: 'members',
    label: 'Membros',
    actions: [
      { key: 'members.view', label: 'Ver a lista de membros' },
      { key: 'members.create', label: 'Cadastrar novos membros' },
      { key: 'members.editProfile', label: 'Editar apelido, WhatsApp, nome, foto e caricatura de outros membros' },
      { key: 'members.changeRole', label: 'Mudar o papel de um membro' },
      { key: 'members.delete', label: 'Excluir a conta de um membro' },
    ],
  },
  {
    key: 'settings',
    label: 'Configurações do Site',
    actions: [{ key: 'settings.edit', label: 'Editar nome, logo, imagens e banners do site' }],
  },
  {
    key: 'gallery',
    label: 'Galeria de Fotos',
    actions: [{ key: 'gallery.manage', label: 'Criar álbuns e subir ou remover fotos' }],
  },
  {
    key: 'feed',
    label: 'Feed',
    actions: [
      { key: 'feed.create', label: 'Publicar no feed (foto, vídeo ou texto)' },
      { key: 'feed.moderate', label: 'Bloquear ou excluir publicações de outras pessoas' },
    ],
  },
  {
    key: 'announcements',
    label: 'Novidades',
    actions: [{ key: 'announcements.manage', label: 'Criar e excluir novidades em tela cheia' }],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATEGORIES.flatMap((c) => c.actions.map((a) => a.key));

export function isValidPermissionKey(key: string): boolean {
  return ALL_PERMISSION_KEYS.includes(key);
}

export function computeEffectivePermissions(
  roleKey: string,
  rolePermissions: { key: string; value: boolean }[],
  overrides: { key: string; value: boolean }[],
): Record<string, boolean> {
  const roleMap = new Map(rolePermissions.map((p) => [p.key, p.value]));
  const overrideMap = new Map(overrides.map((o) => [o.key, o.value]));
  const result: Record<string, boolean> = {};

  for (const key of ALL_PERMISSION_KEYS) {
    if (roleKey === 'admin') {
      result[key] = true;
      continue;
    }
    result[key] = overrideMap.has(key) ? (overrideMap.get(key) as boolean) : (roleMap.get(key) ?? false);
  }

  return result;
}
