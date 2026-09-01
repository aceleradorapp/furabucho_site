import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { ImageUploadButton } from '../components/ImageUploadButton';
import { PrivateLayout } from '../components/PrivateLayout';
import { IMAGE_SPECS } from '../lib/imageSpecs';

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [birthDate, setBirthDate] = useState(toDateInputValue(user?.birthDate));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.patch('/profile', { name, birthDate: birthDate || null });
      await refreshUser();
      setMessage('Perfil atualizado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(blob: Blob) {
    const form = new FormData();
    form.append('image', blob, 'avatar.jpg');
    await api.post('/profile/avatar', form);
    await refreshUser();
  }

  return (
    <PrivateLayout>
      <div className="max-w-lg mx-auto py-8 px-4">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-6">Meu Perfil</h1>

        <div className="flex items-center gap-4 mb-8">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={80} />
          <div>
            <ImageUploadButton spec={IMAGE_SPECS.avatar} buttonLabel="Trocar foto" onUpload={handleAvatarUpload} />
            <p className="text-xs text-text-muted mt-2">{IMAGE_SPECS.avatar.helpText}</p>
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
            <label className="text-sm text-text-muted">Data de nascimento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
            />
            <p className="text-xs text-text-muted mt-1">
              Usaremos para avisar a galera nos aniversários do mês. Só o dia e mês são exibidos publicamente.
            </p>
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
