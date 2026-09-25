import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PageLoader } from '../components/PageLoader';

export function ChangePasswordPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-svh bg-card-subtle flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (!user) return <Navigate to="/?login=1" replace />;
  if (!user.mustChangePassword) return <Navigate to="/feed" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('As duas senhas não são iguais');
      return;
    }

    setLoading(true);
    try {
      // A senha atual não é pedida aqui: quem chega nesta tela está com uma senha que não
      // escolheu, e o servidor sabe disso pela própria conta.
      await api.post('/auth/change-password', { newPassword });
      await refreshUser();
      navigate('/boas-vindas');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível trocar a senha');
    } finally {
      setLoading(false);
    }
  }

  const primeiroNome = user.name.split(' ')[0];

  return (
    <div className="min-h-svh bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-card-lg shadow-2xl p-7 sm:p-8">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <KeyRound size={22} />
        </div>
        <h1 className="font-display uppercase tracking-wider text-xl text-center text-text-main mb-2">
          Bem-vindo, {primeiroNome}!
        </h1>
        <p className="text-sm text-text-muted text-center mb-6">
          Você está usando a senha que te passaram. Escolha uma senha sua para continuar — é o
          único passo antes de entrar.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-text-muted" htmlFor="newPassword">
              Sua nova senha
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 outline-none focus:border-primary"
            />
            <p className="text-xs text-text-muted mt-1">No mínimo 6 caracteres.</p>
          </div>

          <div>
            <label className="text-sm text-text-muted" htmlFor="confirmPassword">
              Repita a nova senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-primary hover:bg-primary-hover text-white font-medium py-3 transition disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar e entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
