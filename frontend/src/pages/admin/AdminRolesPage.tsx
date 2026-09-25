import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PageLoader } from '../../components/PageLoader';
import { PrivateLayout } from '../../components/PrivateLayout';

interface PermissionAction {
  key: string;
  label: string;
}

interface PermissionCategory {
  key: string;
  label: string;
  actions: PermissionAction[];
}

interface Role {
  id: number;
  key: string;
  label: string;
  dailyPostLimit: number;
  dailyRecadoLimit: number;
  permissions: Record<string, boolean>;
}

export function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<PermissionCategory[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [rolesData, catalogData] = await Promise.all([
      api.get<Role[]>('/admin/roles'),
      api.get<PermissionCategory[]>('/admin/roles/catalog'),
    ]);
    setRoles(rolesData);
    setCatalog(catalogData);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function togglePermission(role: Role, actionKey: string) {
    const nextValue = !role.permissions[actionKey];
    setRoles((prev) =>
      prev.map((r) => (r.id === role.id ? { ...r, permissions: { ...r.permissions, [actionKey]: nextValue } } : r)),
    );
    setSavingKey(`${role.id}:${actionKey}`);
    try {
      await api.patch(`/admin/roles/${role.id}`, { permissions: { [actionKey]: nextValue } });
    } finally {
      setSavingKey(null);
    }
  }

  async function saveDailyPostLimit(role: Role, value: number) {
    const safeValue = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : role.dailyPostLimit;
    setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...r, dailyPostLimit: safeValue } : r)));
    await api.patch(`/admin/roles/${role.id}`, { dailyPostLimit: safeValue });
  }

  async function saveDailyRecadoLimit(role: Role, value: number) {
    const safeValue = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : role.dailyRecadoLimit;
    setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...r, dailyRecadoLimit: safeValue } : r)));
    await api.patch(`/admin/roles/${role.id}`, { dailyRecadoLimit: safeValue });
  }

  return (
    <PrivateLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2">Papéis & Permissões</h1>
        <p className="text-sm text-text-muted mb-6">
          O que cada papel pode fazer por padrão. Todo membro cadastrado com um desses papéis recebe exatamente essas
          permissões — para abrir uma exceção pontual pra alguém específico, use "Permissões por usuário".
        </p>

        {loading && <PageLoader />}

        <div className="flex flex-col gap-5">
          {!loading && roles.map((role) => {
            const isAdminRole = role.key === 'admin';
            return (
              <div key={role.id} className="border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h2 className="font-medium text-text-main">{role.label}</h2>
                  <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
                    <label className="flex items-center gap-2 text-xs text-text-muted">
                      Posts por dia
                      <input
                        type="number"
                        min={0}
                        defaultValue={role.dailyPostLimit}
                        key={`${role.id}-${role.dailyPostLimit}`}
                        onBlur={(e) => saveDailyPostLimit(role, Number(e.target.value))}
                        className="w-16 rounded-lg border border-border px-2 py-1 text-sm text-text-main outline-none focus:border-primary"
                        title="0 = sem limite"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-text-muted">
                      Bilhetinhos por dia
                      <input
                        type="number"
                        min={0}
                        defaultValue={role.dailyRecadoLimit}
                        key={`${role.id}-recado-${role.dailyRecadoLimit}`}
                        onBlur={(e) => saveDailyRecadoLimit(role, Number(e.target.value))}
                        className="w-16 rounded-lg border border-border px-2 py-1 text-sm text-text-main outline-none focus:border-primary"
                        title="Quantos envios por dia. Cada envio conta 1, mesmo indo pra várias pessoas. 0 = desativa os bilhetinhos para este papel."
                      />
                    </label>
                    {isAdminRole && (
                      <span className="text-xs text-text-muted bg-card-subtle rounded-full px-2.5 py-1">
                        sempre acesso total
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {catalog.map((category) => (
                    <div key={category.key}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                        {category.label}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {category.actions.map((action) => {
                          const checked = isAdminRole || role.permissions[action.key];
                          const saving = savingKey === `${role.id}:${action.key}`;
                          return (
                            <label
                              key={action.key}
                              className={`flex items-start gap-2 rounded-xl border px-3 py-2 transition ${
                                checked ? 'border-primary bg-primary/5' : 'border-border'
                              } ${isAdminRole ? 'opacity-60' : 'cursor-pointer hover:border-primary/50'}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isAdminRole || saving}
                                onChange={() => togglePermission(role, action.key)}
                                className="mt-0.5 accent-primary"
                              />
                              <span className="text-sm text-text-main leading-snug">{action.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PrivateLayout>
  );
}
