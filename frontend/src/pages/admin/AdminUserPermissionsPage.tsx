import { RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Avatar } from '../../components/Avatar';
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

interface MemberUser {
  id: number;
  name: string;
  nickname: string | null;
  email: string;
  avatarUrl: string | null;
  roleLabel: string;
  role: string;
}

interface PermissionState {
  default: boolean;
  override: boolean | null;
  effective: boolean;
}

interface UserPermissionsResponse {
  userId: number;
  roleKey: string;
  roleLabel: string;
  isAdmin: boolean;
  permissions: Record<string, PermissionState>;
}

export function AdminUserPermissionsPage() {
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [catalog, setCatalog] = useState<PermissionCategory[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<UserPermissionsResponse | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    Promise.all([api.get<MemberUser[]>('/admin/users'), api.get<PermissionCategory[]>('/admin/user-permissions/catalog')]).then(
      ([usersData, catalogData]) => {
        setUsers(usersData);
        setCatalog(catalogData);
      },
    );
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const nonAdmin = users.filter((u) => u.role !== 'admin');
    if (!q) return nonAdmin;
    return nonAdmin.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nickname ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  async function selectUser(id: number) {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const data = await api.get<UserPermissionsResponse>(`/admin/user-permissions/${id}`);
      setDetail(data);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function setOverride(actionKey: string, value: boolean | null) {
    if (!detail) return;
    setSavingKey(actionKey);
    try {
      const updated = await api.put<UserPermissionsResponse>(`/admin/user-permissions/${detail.userId}`, {
        overrides: { [actionKey]: value },
      });
      setDetail(updated);
    } finally {
      setSavingKey(null);
    }
  }

  const selectedUser = users.find((u) => u.id === selectedId) ?? null;

  return (
    <PrivateLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2">Permissões por Usuário</h1>
        <p className="text-sm text-text-muted mb-6">
          Escolha um membro e libere ou bloqueie ações específicas, além do que o papel dele já permite por padrão.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
          <div className="bg-card border border-border rounded-2xl p-3 md:h-[560px] flex flex-col">
            <div className="relative mb-2 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar membro..."
                className="w-full rounded-full border border-border pl-8 pr-3 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="overflow-y-auto flex-1 flex flex-col gap-1">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u.id)}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                    selectedId === u.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-card-subtle border border-transparent'
                  }`}
                >
                  <Avatar name={u.nickname || u.name} avatarUrl={u.avatarUrl} size={30} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-main truncate">{u.nickname || u.name}</p>
                    <p className="text-xs text-text-muted truncate">{u.roleLabel}</p>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-text-muted text-center py-6">Nenhum membro encontrado.</p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            {!selectedUser && (
              <div className="h-full flex flex-col items-center justify-center text-text-muted py-16">
                <ShieldCheck size={32} className="text-border mb-2" />
                <p className="text-sm">Selecione um membro pra ver e ajustar as permissões dele.</p>
              </div>
            )}

            {selectedUser && loadingDetail && <p className="text-sm text-text-muted py-8 text-center">Carregando...</p>}

            {selectedUser && detail && !loadingDetail && (
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Avatar name={selectedUser.nickname || selectedUser.name} avatarUrl={selectedUser.avatarUrl} size={40} />
                  <div>
                    <p className="font-medium text-text-main">{selectedUser.nickname || selectedUser.name}</p>
                    <p className="text-xs text-text-muted">
                      {detail.roleLabel} · padrão do papel + exceções individuais abaixo
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-5 mt-5">
                  {catalog.map((category) => (
                    <div key={category.key}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                        {category.label}
                      </p>
                      <div className="flex flex-col gap-2">
                        {category.actions.map((action) => {
                          const state = detail.permissions[action.key];
                          if (!state) return null;
                          const isCustom = state.override !== null;
                          const saving = savingKey === action.key;
                          return (
                            <div
                              key={action.key}
                              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition ${
                                isCustom ? 'border-primary/40 bg-primary/5' : 'border-border'
                              }`}
                            >
                              <label className="flex items-start gap-2.5 flex-1 cursor-pointer min-w-0">
                                <input
                                  type="checkbox"
                                  checked={state.effective}
                                  disabled={saving}
                                  onChange={() => setOverride(action.key, !state.effective)}
                                  className="mt-0.5 accent-primary shrink-0"
                                />
                                <span className="text-sm text-text-main leading-snug">{action.label}</span>
                              </label>
                              {isCustom ? (
                                <button
                                  onClick={() => setOverride(action.key, null)}
                                  disabled={saving}
                                  title="Voltar para o padrão do papel"
                                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-hover transition px-2 py-1 rounded-full bg-primary/10"
                                >
                                  <RotateCcw size={11} /> personalizado
                                </button>
                              ) : (
                                <span className="shrink-0 text-[11px] text-text-muted">padrão</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
}
