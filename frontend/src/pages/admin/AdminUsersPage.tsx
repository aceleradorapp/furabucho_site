import { BadgeCheck, ImageIcon, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../../components/Avatar';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { PrivateLayout } from '../../components/PrivateLayout';
import { type EditableMember, UserFormModal } from '../../components/UserFormModal';

interface Role {
  id: number;
  key: string;
  label: string;
}

interface MemberUser extends EditableMember {
  role: string;
  roleLabel: string;
  mustChangePassword: boolean;
  createdAt: string;
}

export function AdminUsersPage() {
  const { user: authUser } = useAuth();
  const confirm = useConfirm();
  const canCreate = authUser?.permissions['members.create'] ?? false;
  const canEditProfile = authUser?.permissions['members.editProfile'] ?? false;
  const canChangeRole = authUser?.permissions['members.changeRole'] ?? false;
  const canDelete = authUser?.permissions['members.delete'] ?? false;
  const isAdmin = authUser?.role === 'admin';
  const canEditAnything = canEditProfile || canChangeRole || isAdmin;

  const [users, setUsers] = useState<MemberUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [lastCreated, setLastCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<MemberUser | null>(null);

  async function load() {
    const u = await api.get<MemberUser[]>('/admin/users');
    setUsers(u);
    if (canCreate || canChangeRole) {
      const r = await api.get<Role[]>('/admin/users/roles');
      setRoles(r);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nickname ?? '').toLowerCase().includes(q) ||
        (u.whatsapp ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  function openCreate() {
    setModalMode('create');
    setEditingUser(null);
    setModalOpen(true);
  }

  function openEdit(target: MemberUser) {
    setModalMode('edit');
    setEditingUser(target);
    setModalOpen(true);
  }

  function handleSaved(created?: { email: string; tempPassword: string }) {
    if (created) setLastCreated(created);
    load();
  }

  async function handleDeleteUser(target: MemberUser) {
    const ok = await confirm({
      title: `Excluir ${target.nickname || target.name}?`,
      description:
        'A conta será removida definitivamente, junto com as publicações, curtidas e comentários feitos por essa pessoa. Essa ação não pode ser desfeita.',
      variant: 'danger',
    });
    if (!ok) return;
    await api.delete(`/admin/users/${target.id}`);
    setUsers((prev) => prev.filter((u) => u.id !== target.id));
  }

  const canManageRowFor = (target: MemberUser) =>
    canEditAnything && !(target.role === 'admin' && !isAdmin);
  const canDeleteRowFor = (target: MemberUser) =>
    canDelete && target.id !== authUser?.id && !(target.role === 'admin' && !isAdmin);

  return (
    <PrivateLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2">Membros</h1>
        <p className="text-sm text-text-muted mb-6">
          {canCreate
            ? 'Cadastre e edite membros, com foto de perfil, caricatura, papel e o título de Ponta Firme.'
            : 'Edite perfil e caricatura dos membros, ou exclua uma conta.'}
        </p>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou WhatsApp..."
              className="w-full rounded-full border border-border pl-9 pr-4 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          {canCreate && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 transition"
            >
              <Plus size={16} /> Adicionar membro
            </button>
          )}
        </div>

        {lastCreated && (
          <div className="bg-card-subtle rounded-xl p-4 mb-4 text-sm">
            <p className="text-text-main font-medium mb-1">Membro cadastrado com sucesso!</p>
            <p className="text-text-muted">
              Repasse essa senha temporária para <strong>{lastCreated.email}</strong>. No primeiro acesso ele será
              obrigado a trocá-la.
            </p>
            <p className="mt-2 font-mono bg-white border border-border rounded-lg px-3 py-1.5 inline-block">
              {lastCreated.tempPassword}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 340px)', minHeight: 240 }}>
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={u.name} avatarUrl={u.avatarUrl} size={42} />
                  <span className="text-[9px] text-text-muted uppercase tracking-wide">Foto</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {u.caricatureUrl ? (
                    <Avatar name={u.nickname || u.name} avatarUrl={u.caricatureUrl} size={42} />
                  ) : (
                    <div className="w-[42px] h-[42px] rounded-full border-2 border-dashed border-border flex items-center justify-center text-text-muted/50">
                      <ImageIcon size={16} />
                    </div>
                  )}
                  <span className="text-[9px] text-text-muted uppercase tracking-wide">Caricatura</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-text-main truncate">{u.nickname || u.name}</p>
                  {u.isPontaFirme && <BadgeCheck size={14} className="text-primary shrink-0" />}
                  {u.nickname && <span className="text-xs text-text-muted truncate">({u.name})</span>}
                </div>
                <p className="text-xs text-text-muted truncate">{u.email}</p>
                {u.whatsapp && <p className="text-xs text-text-muted truncate">{u.whatsapp}</p>}
                <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                  <span className="rounded-full bg-card-subtle px-2 py-0.5">{u.roleLabel}</span>
                  {u.mustChangePassword ? (
                    <span className="text-amber-600">aguardando 1º acesso</span>
                  ) : (
                    <span className="text-green-700">ativo</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                {canManageRowFor(u) && (
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="text-text-muted hover:text-primary transition p-1.5"
                    aria-label="Editar membro"
                    title="Editar membro"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {canDeleteRowFor(u) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(u)}
                    className="text-text-muted hover:text-red-600 transition p-1.5"
                    aria-label="Excluir membro"
                    title="Excluir membro"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <p className="text-sm text-text-muted py-6 text-center">Nenhum membro encontrado.</p>
          )}
        </div>
      </div>

      <UserFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        initialUser={editingUser ?? undefined}
        roles={roles}
        canChangeRole={canChangeRole}
        isAdminViewer={isAdmin}
        onSaved={handleSaved}
      />
    </PrivateLayout>
  );
}
