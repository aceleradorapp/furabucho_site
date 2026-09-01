import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { PrivateLayout } from '../../components/PrivateLayout';

interface Role {
  id: number;
  key: string;
  label: string;
}

interface MemberUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  roleLabel: string;
  mustChangePassword: boolean;
  createdAt: string;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const [u, r] = await Promise.all([api.get<MemberUser[]>('/admin/users'), api.get<Role[]>('/admin/users/roles')]);
    setUsers(u);
    setRoles(r);
    if (!roleId && r.length) setRoleId(r.find((role) => role.key === 'membro')?.id ?? r[0].id);
  }

  useEffect(() => {
    load();
  }, []);

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
      });
      setLastCreated({ email: created.email, tempPassword: created.tempPassword });
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível cadastrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PrivateLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-6">Cadastro de Membros</h1>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="py-2">Nome</th>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/60">
                <td className="py-2">{u.name}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.roleLabel}</td>
                <td>
                  {u.mustChangePassword ? (
                    <span className="text-xs text-amber-600">aguardando 1º acesso</span>
                  ) : (
                    <span className="text-xs text-green-700">ativo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PrivateLayout>
  );
}
