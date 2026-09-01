import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) return <Navigate to="/?login=1" replace />;
  if (!user.mustChangePassword) return <Navigate to="/feed" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('As senhas novas não coincidem');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      await refreshUser();
      navigate('/feed');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível trocar a senha');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-card-lg shadow-2xl p-8">
        <h1 className="font-display uppercase tracking-wider text-xl text-center text-text-main mb-2">
          Primeiro acesso
        </h1>
        <p className="text-sm text-text-muted text-center mb-6">
          Por segurança, defina uma nova senha antes de continuar.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-text-muted" htmlFor="currentPassword">
              Senha atual (temporária)
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm text-text-muted" htmlFor="newPassword">
              Nova senha
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm text-text-muted" htmlFor="confirmPassword">
              Confirmar nova senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 transition disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
