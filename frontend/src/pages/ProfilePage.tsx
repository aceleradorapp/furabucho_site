import { useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { PrivateLayout } from '../components/PrivateLayout';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.patch('/profile', { name });
      await refreshUser();
      setMessage('Perfil atualizado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      await api.post('/profile/avatar', form);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar a foto');
    } finally {
      setUploading(false);
    }
  }

  return (
    <PrivateLayout>
      <div className="max-w-lg mx-auto py-8 px-4">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-6">Meu Perfil</h1>

        <div className="flex items-center gap-4 mb-8">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={80} />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatarChange(e.target.files[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm rounded-full border border-border px-4 py-1.5 hover:border-primary transition disabled:opacity-60"
            >
              {uploading ? 'Enviando...' : 'Trocar foto'}
            </button>
            <p className="text-xs text-text-muted mt-2">PNG ou JPG, até 8MB.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
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
            <label className="text-sm text-text-muted">E-mail</label>
            <input
              value={user.email}
              disabled
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 bg-card-subtle text-text-muted"
            />
          </div>

          <div>
            <label className="text-sm text-text-muted">Papel</label>
            <input
              value={user.roleLabel}
              disabled
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 bg-card-subtle text-text-muted"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="self-start rounded-full bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 transition disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </PrivateLayout>
  );
}
