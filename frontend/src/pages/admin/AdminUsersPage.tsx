import { BadgeCheck, ImagePlus, Pencil, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../../components/Avatar';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { ImageUploadButton } from '../../components/ImageUploadButton';
import { PrivateLayout } from '../../components/PrivateLayout';
import { SaveStatusBadge, type SaveStatus } from '../../components/SaveStatusBadge';
import { IMAGE_SPECS } from '../../lib/imageSpecs';

interface Role {
  id: number;
  key: string;
  label: string;
}

interface MemberUser {
  id: number;
  name: string;
  nickname: string | null;
  whatsapp: string | null;
  username: string;
  email: string;
  roleId: number;
  role: string;
  roleLabel: string;
  mustChangePassword: boolean;
  createdAt: string;
  avatarUrl: string | null;
  caricatureUrl: string | null;
  isPontaFirme: boolean;
}

const AUTOSAVE_DELAY = 900;

export function AdminUsersPage() {
  const { user: authUser } = useAuth();
  const confirm = useConfirm();
  const canManageUsers = authUser?.permissions.canManageUsers ?? false;
  const canManageMemberProfiles = authUser?.permissions.canManageMemberProfiles ?? false;
  const isAdmin = authUser?.role === 'admin';

  const [users, setUsers] = useState<MemberUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [rowStatus, setRowStatus] = useState<Record<number, SaveStatus>>({});

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const nicknameTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const nameTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const whatsappTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  async function load() {
    const u = await api.get<MemberUser[]>('/admin/users');
    setUsers(u);
    if (canManageUsers) {
      const r = await api.get<Role[]>('/admin/users/roles');
      setRoles(r);
      setRoleId((prev) => prev || r.find((role) => role.key === 'membro')?.id || r[0]?.id || '');
    }
  }

  useEffect(() => {
    load();
    return () => {
      nicknameTimeoutsRef.current.forEach(clearTimeout);
      nameTimeoutsRef.current.forEach(clearTimeout);
      whatsappTimeoutsRef.current.forEach(clearTimeout);
    };
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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLastCreated(null);
    if (!roleId) return;
    setLoading(true);
    try {
      const created = await api.post<{ email: string; tempPassword: string }>('/admin/users', {
        name,
        username,
        email,
        roleId,
        ...(password ? { password } : {}),
        ...(nickname.trim() ? { nickname: nickname.trim() } : {}),
        ...(whatsapp.trim() ? { whatsapp: whatsapp.trim() } : {}),
      });
      setLastCreated({ email: created.email, tempPassword: created.tempPassword });
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setNickname('');
      setWhatsapp('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível cadastrar');
    } finally {
      setLoading(false);
    }
  }

  async function persistRowAction(id: number, action: () => Promise<void>): Promise<boolean> {
    setRowStatus((prev) => ({ ...prev, [id]: 'saving' }));
    try {
      await action();
      setRowStatus((prev) => ({ ...prev, [id]: 'saved' }));
      return true;
    } catch {
      setRowStatus((prev) => ({ ...prev, [id]: 'error' }));
      return false;
    } finally {
      setTimeout(() => setRowStatus((prev) => ({ ...prev, [id]: 'idle' })), 2200);
    }
  }

  function updateNickname(id: number, value: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, nickname: value } : u)));

    const existing = nicknameTimeoutsRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => {
      persistRowAction(id, async () => {
        const updated = await api.patch<{ nickname: string | null }>(`/admin/users/${id}/profile-extras`, {
          nickname: value,
        });
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, nickname: updated.nickname } : u)));
      });
    }, AUTOSAVE_DELAY);
    nicknameTimeoutsRef.current.set(id, timeout);
  }

  function updateName(id: number, value: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, name: value } : u)));

    const existing = nameTimeoutsRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => {
      persistRowAction(id, async () => {
        await api.patch<{ name: string }>(`/admin/users/${id}/profile-extras`, { name: value });
      });
    }, AUTOSAVE_DELAY);
    nameTimeoutsRef.current.set(id, timeout);
  }

  function updateWhatsapp(id: number, value: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, whatsapp: value } : u)));

    const existing = whatsappTimeoutsRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => {
      persistRowAction(id, async () => {
        const updated = await api.patch<{ whatsapp: string | null }>(`/admin/users/${id}/profile-extras`, {
          whatsapp: value || null,
        });
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, whatsapp: updated.whatsapp } : u)));
      });
    }, AUTOSAVE_DELAY);
    whatsappTimeoutsRef.current.set(id, timeout);
  }

  async function handleRoleChange(target: MemberUser, newRoleId: number) {
    const previousRoleId = target.roleId;
    const role = roles.find((r) => r.id === newRoleId);
    if (!role) return;

    setUsers((prev) =>
      prev.map((u) => (u.id === target.id ? { ...u, roleId: newRoleId, role: role.key, roleLabel: role.label } : u)),
    );

    const ok = await persistRowAction(target.id, async () => {
      await api.patch(`/admin/users/${target.id}`, { roleId: newRoleId });
    });

    if (!ok) {
      const previousRole = roles.find((r) => r.id === previousRoleId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id && previousRole
            ? { ...u, roleId: previousRoleId, role: previousRole.key, roleLabel: previousRole.label }
            : u,
        ),
      );
    }
  }

  async function handleDeleteUser(target: MemberUser) {
    const ok = await confirm({
      title: `Excluir ${target.nickname || target.name}?`,
      description:
        'A conta será removida definitivamente, junto com as publicações, curtidas e comentários feitos por essa pessoa. Essa ação não pode ser desfeita.',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/admin/users/${target.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir');
    }
  }

  async function handleUploadCaricature(id: number, blob: Blob) {
    const form = new FormData();
    form.append('image', blob, 'caricature.jpg');
    await persistRowAction(id, async () => {
      const updated = await api.post<{ caricatureUrl: string | null }>(`/admin/users/${id}/caricature`, form);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, caricatureUrl: updated.caricatureUrl } : u)));
    });
  }

  async function handleRemoveCaricature(id: number) {
    if (!(await confirm({ title: 'Remover a caricatura deste membro?', variant: 'danger' }))) return;
    await persistRowAction(id, async () => {
      const updated = await api.patch<{ caricatureUrl: string | null }>(`/admin/users/${id}/profile-extras`, {
        caricatureUrl: null,
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, caricatureUrl: updated.caricatureUrl } : u)));
    });
  }

  async function handleTogglePontaFirme(target: MemberUser) {
    const nextValue = !target.isPontaFirme;
    setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, isPontaFirme: nextValue } : u)));

    const ok = await persistRowAction(target.id, async () => {
      const updated = await api.patch<{ isPontaFirme: boolean }>(`/admin/users/${target.id}/ponta-firme`, {
        isPontaFirme: nextValue,
      });
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, isPontaFirme: updated.isPontaFirme } : u)));
    });

    if (!ok) {
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, isPontaFirme: target.isPontaFirme } : u)));
    }
  }

  return (
    <PrivateLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2">Membros</h1>
        <p className="text-sm text-text-muted mb-6">
          {canManageUsers
            ? 'Cadastre novos membros e gerencie apelido, caricatura, papel e o título de Ponta Firme.'
            : 'Edite nome, apelido e caricatura dos membros, ou exclua uma conta.'}
        </p>

        {canManageUsers && (
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-card border border-border rounded-2xl p-5"
          >
            <div>
              <label className="text-sm text-text-muted">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-text-muted">Usuário</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-text-muted">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-text-muted">Senha temporária (opcional)</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Deixe em branco para gerar automaticamente"
                minLength={6}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-text-muted">Apelido (opcional)</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Como a pessoa é chamada"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-text-muted">WhatsApp (opcional)</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 91234-5678"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-text-muted">Papel</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="md:col-span-2 self-start rounded-full bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 transition disabled:opacity-60"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar membro'}
            </button>
          </form>
        )}

        {lastCreated && (
          <div className="bg-card-subtle rounded-xl p-4 mb-8 text-sm">
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

        <div className="relative mb-4 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full rounded-full border border-border pl-9 pr-4 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-3">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card border border-border rounded-2xl p-4"
            >
              <CaricatureCell
                user={u}
                onUpload={(blob) => handleUploadCaricature(u.id, blob)}
                onRemove={u.caricatureUrl ? () => handleRemoveCaricature(u.id) : undefined}
              />

              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 items-center">
                <div className="min-w-0">
                  <div className="relative">
                    <input
                      value={u.name}
                      onChange={(e) => updateName(u.id, e.target.value)}
                      title="Clique para editar o nome"
                      className="text-sm font-medium text-text-main bg-transparent outline-none border-b border-transparent hover:border-border focus:border-primary transition w-full truncate -ml-px pr-4"
                    />
                    <Pencil
                      size={11}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted/50 pointer-events-none"
                    />
                  </div>
                  <p className="text-xs text-text-muted truncate">{u.email}</p>
                </div>

                <input
                  value={u.nickname ?? ''}
                  onChange={(e) => updateNickname(u.id, e.target.value)}
                  placeholder="Apelido"
                  className="text-sm rounded-lg border border-border px-2.5 py-1.5 outline-none focus:border-primary transition"
                />

                <input
                  type="tel"
                  value={u.whatsapp ?? ''}
                  onChange={(e) => updateWhatsapp(u.id, e.target.value)}
                  placeholder="WhatsApp"
                  className="text-sm rounded-lg border border-border px-2.5 py-1.5 outline-none focus:border-primary transition"
                />

                {canManageUsers && (
                  <div className="text-xs text-text-muted flex items-center gap-2">
                    <select
                      value={u.roleId}
                      onChange={(e) => handleRoleChange(u, Number(e.target.value))}
                      disabled={u.id === authUser?.id}
                      title={u.id === authUser?.id ? 'Você não pode alterar seu próprio papel' : undefined}
                      className="rounded-lg border border-border px-1.5 py-1 outline-none focus:border-primary bg-white text-text-main disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <span>•</span>
                    {u.mustChangePassword ? (
                      <span className="text-amber-600">aguardando 1º acesso</span>
                    ) : (
                      <span className="text-green-700">ativo</span>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <label className="inline-flex items-center gap-2 text-xs text-text-main cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={u.isPontaFirme}
                      onChange={() => handleTogglePontaFirme(u)}
                      className="accent-primary"
                    />
                    <span className="inline-flex items-center gap-1 font-medium">
                      <BadgeCheck size={14} className={u.isPontaFirme ? 'text-primary' : 'text-text-muted'} />
                      Ponta Firme
                    </span>
                  </label>
                )}
              </div>

              <div className="w-24 shrink-0 flex items-center gap-1 sm:justify-end">
                <SaveStatusBadge status={rowStatus[u.id] ?? 'idle'} compact />
                {(canManageUsers || canManageMemberProfiles) &&
                  u.id !== authUser?.id &&
                  !(u.role === 'admin' && !isAdmin) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(u)}
                    className="text-text-muted hover:text-red-600 transition p-1.5 shrink-0"
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
    </PrivateLayout>
  );
}

function CaricatureCell({
  user,
  onUpload,
  onRemove,
}: {
  user: MemberUser;
  onUpload: (blob: Blob) => Promise<void>;
  onRemove?: () => void;
}) {
  return (
    <div className="relative shrink-0 w-14 h-14">
      <Avatar name={user.nickname || user.name} avatarUrl={user.caricatureUrl} size={56} />
      <div className="absolute -bottom-1 -right-1">
        <ImageUploadButton
          spec={IMAGE_SPECS.caricature}
          buttonLabel={<ImagePlus size={11} />}
          onUpload={onUpload}
          className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white shadow hover:bg-primary-hover transition"
        />
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          title="Remover caricatura"
          className="absolute -top-1 -right-1 bg-white text-red-600 border border-border rounded-full p-0.5 shadow-sm hover:bg-red-50 transition"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}
