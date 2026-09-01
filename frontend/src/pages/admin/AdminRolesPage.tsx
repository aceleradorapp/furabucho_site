import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PrivateLayout } from '../../components/PrivateLayout';

interface Role {
  id: number;
  key: string;
  label: string;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManagePosts: boolean;
  canManageGallery: boolean;
}

const PERMISSION_LABELS: { key: keyof Role; label: string; description: string }[] = [
  { key: 'canManageUsers', label: 'Gerenciar usuários', description: 'Cadastrar membros e definir seus papéis' },
  {
    key: 'canManageSettings',
    label: 'Gerenciar configurações',
    description: 'Editar nome/imagens do site e os banners',
  },
  { key: 'canManagePosts', label: 'Criar postagens', description: 'Publicar novos cards no feed' },
  { key: 'canManageGallery', label: 'Gerenciar galeria', description: 'Criar álbuns e subir/remover fotos' },
];

export function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);

  async function load() {
    const data = await api.get<Role[]>('/admin/roles');
    setRoles(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function togglePermission(role: Role, key: keyof Role) {
    if (key === 'id' || key === 'key' || key === 'label') return;
    const nextValue = !role[key];

    setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...r, [key]: nextValue } : r)));
    setSavingId(role.id);
    try {
      await api.patch(`/admin/roles/${role.id}`, { [key]: nextValue });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <PrivateLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2">Papéis & Permissões</h1>
        <p className="text-sm text-text-muted mb-6">
          Controle o que cada papel pode fazer no sistema. Mudanças valem para todos os membros daquele papel.
        </p>

        <div className="flex flex-col gap-4">
          {roles.map((role) => (
            <div key={role.id} className="border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-text-main">{role.label}</h2>
                {savingId === role.id && <span className="text-xs text-text-muted">salvando...</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PERMISSION_LABELS.map((perm) => {
                  const checked = role[perm.key] as boolean;
                  const isAdminRole = role.key === 'admin';
                  return (
                    <label
                      key={perm.key}
                      className={`flex items-start gap-2 rounded-xl border px-3 py-2 ${
                        checked ? 'border-primary bg-primary/5' : 'border-border'
                      } ${isAdminRole ? 'opacity-60' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isAdminRole}
                        onChange={() => togglePermission(role, perm.key)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm text-text-main">{perm.label}</span>
                        <span className="block text-xs text-text-muted">{perm.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PrivateLayout>
  );
}
