import * as Dialog from '@radix-ui/react-dialog';
import { BadgeCheck, ImageIcon, ImagePlus, Send, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import { IMAGE_SPECS } from '../lib/imageSpecs';
import { UPLOADS_BASE } from '../lib/config';
import { ImageUploadButton } from './ImageUploadButton';

export interface EditableMember {
  id: number;
  name: string;
  nickname: string | null;
  whatsapp: string | null;
  username: string;
  email: string;
  roleId: number;
  avatarUrl: string | null;
  caricatureUrl: string | null;
  isPontaFirme: boolean;
}

interface Role {
  id: number;
  key: string;
  label: string;
}

const inputClass = 'mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary transition';

function ImagePickerField({
  label,
  previewUrl,
  onPick,
  onRemove,
}: {
  label: string;
  previewUrl: string | null;
  onPick: (blob: Blob) => Promise<void>;
  onRemove?: () => void;
}) {
  return (
    <div>
      <p className="text-sm text-text-muted mb-1.5">{label}</p>
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 shrink-0">
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center text-text-muted/50">
              <ImageIcon size={22} />
            </div>
          )}
          {previewUrl && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute -top-1 -right-1 bg-white text-red-600 border border-border rounded-full p-0.5 shadow-sm hover:bg-red-50 transition"
              title={`Remover ${label.toLowerCase()}`}
            >
              <X size={11} />
            </button>
          )}
        </div>
        <ImageUploadButton
          spec={IMAGE_SPECS.avatar}
          buttonLabel={
            <span className="inline-flex items-center gap-1.5">
              <ImagePlus size={13} /> {previewUrl ? 'Trocar' : 'Escolher'}
            </span>
          }
          onUpload={onPick}
          className="text-xs font-medium rounded-full border border-border px-3 py-1.5 hover:border-primary transition"
        />
      </div>
    </div>
  );
}

export function UserFormModal({
  open,
  onOpenChange,
  mode,
  initialUser,
  roles,
  canChangeRole,
  isAdminViewer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialUser?: EditableMember;
  roles: Role[];
  canChangeRole: boolean;
  isAdminViewer: boolean;
  onSaved: (created?: { email: string; tempPassword: string }) => void;
}) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [isPontaFirme, setIsPontaFirme] = useState(false);

  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarCleared, setAvatarCleared] = useState(false);
  const [caricatureBlob, setCaricatureBlob] = useState<Blob | null>(null);
  const [caricaturePreview, setCaricaturePreview] = useState<string | null>(null);
  const [caricatureCleared, setCaricatureCleared] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialUser) {
      setName(initialUser.name);
      setUsername(initialUser.username);
      setEmail(initialUser.email);
      setNickname(initialUser.nickname ?? '');
      setWhatsapp(initialUser.whatsapp ?? '');
      setRoleId(initialUser.roleId);
      setIsPontaFirme(initialUser.isPontaFirme);
      setAvatarPreview(initialUser.avatarUrl ? `${UPLOADS_BASE}${initialUser.avatarUrl}` : null);
      setCaricaturePreview(initialUser.caricatureUrl ? `${UPLOADS_BASE}${initialUser.caricatureUrl}` : null);
    } else {
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setNickname('');
      setWhatsapp('');
      setRoleId(roles.find((r) => r.key === 'membro')?.id ?? roles[0]?.id ?? '');
      setIsPontaFirme(false);
      setAvatarPreview(null);
      setCaricaturePreview(null);
    }
    setAvatarBlob(null);
    setCaricatureBlob(null);
    setAvatarCleared(false);
    setCaricatureCleared(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initialUser]);

  async function handlePickAvatar(blob: Blob) {
    setAvatarBlob(blob);
    setAvatarCleared(false);
    setAvatarPreview(URL.createObjectURL(blob));
  }

  async function handlePickCaricature(blob: Blob) {
    setCaricatureBlob(blob);
    setCaricatureCleared(false);
    setCaricaturePreview(URL.createObjectURL(blob));
  }

  function handleRemoveAvatar() {
    setAvatarBlob(null);
    setAvatarPreview(null);
    setAvatarCleared(true);
  }

  function handleRemoveCaricature() {
    setCaricatureBlob(null);
    setCaricaturePreview(null);
    setCaricatureCleared(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Escreva um nome');
    if (mode === 'create' && (!username.trim() || !email.trim())) return setError('Preencha usuário e e-mail');

    setSaving(true);
    try {
      if (mode === 'create') {
        const form = new FormData();
        form.append('name', name.trim());
        form.append('username', username.trim());
        form.append('email', email.trim());
        if (password.trim()) form.append('password', password.trim());
        if (nickname.trim()) form.append('nickname', nickname.trim());
        if (whatsapp.trim()) form.append('whatsapp', whatsapp.trim());
        if (canChangeRole && roleId) form.append('roleId', String(roleId));
        if (avatarBlob) form.append('avatar', avatarBlob, 'avatar.jpg');
        if (caricatureBlob) form.append('caricature', caricatureBlob, 'caricature.jpg');

        const created = await api.post<{ email: string; tempPassword: string }>('/admin/users', form);
        onOpenChange(false);
        onSaved({ email: created.email, tempPassword: created.tempPassword });
      } else if (initialUser) {
        const tasks: Promise<unknown>[] = [];

        tasks.push(
          api.patch(`/admin/users/${initialUser.id}/profile-extras`, {
            name: name.trim(),
            nickname: nickname.trim() || null,
            whatsapp: whatsapp.trim() || null,
            ...(avatarCleared ? { avatarUrl: null } : {}),
            ...(caricatureCleared ? { caricatureUrl: null } : {}),
          }),
        );

        if (avatarBlob) {
          const form = new FormData();
          form.append('image', avatarBlob, 'avatar.jpg');
          tasks.push(api.post(`/admin/users/${initialUser.id}/avatar`, form));
        }
        if (caricatureBlob) {
          const form = new FormData();
          form.append('image', caricatureBlob, 'caricature.jpg');
          tasks.push(api.post(`/admin/users/${initialUser.id}/caricature`, form));
        }
        if (canChangeRole && roleId && roleId !== initialUser.roleId) {
          tasks.push(api.patch(`/admin/users/${initialUser.id}`, { roleId }));
        }
        if (isAdminViewer && isPontaFirme !== initialUser.isPontaFirme) {
          tasks.push(api.patch(`/admin/users/${initialUser.id}/ponta-firme`, { isPontaFirme }));
        }

        await Promise.all(tasks);
        onOpenChange(false);
        onSaved();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl focus:outline-none flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <Dialog.Title className="font-semibold text-text-main">
              {mode === 'create' ? 'Adicionar membro' : 'Editar membro'}
            </Dialog.Title>
            <Dialog.Close className="text-text-muted hover:text-text-main transition" aria-label="Fechar">
              <X size={20} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImagePickerField
                label="Foto de perfil"
                previewUrl={avatarPreview}
                onPick={handlePickAvatar}
                onRemove={avatarPreview ? handleRemoveAvatar : undefined}
              />
              <ImagePickerField
                label="Caricatura"
                previewUrl={caricaturePreview}
                onPick={handlePickCaricature}
                onRemove={caricaturePreview ? handleRemoveCaricature : undefined}
              />
            </div>
            <p className="text-xs text-text-muted -mt-2">
              A caricatura é uma imagem separada da foto de perfil, usada em outros lugares do site.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-muted">Nome</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className="text-sm text-text-muted">Apelido (opcional)</label>
                <input value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-sm text-text-muted">Usuário (login)</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={mode === 'edit'}
                  className={`${inputClass} disabled:bg-card-subtle disabled:text-text-muted`}
                />
              </div>
              <div>
                <label className="text-sm text-text-muted">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={mode === 'edit'}
                  className={`${inputClass} disabled:bg-card-subtle disabled:text-text-muted`}
                />
              </div>
              <div>
                <label className="text-sm text-text-muted">WhatsApp (opcional)</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 91234-5678"
                  className={inputClass}
                />
              </div>
              {mode === 'create' && (
                <div>
                  <label className="text-sm text-text-muted">Senha temporária (opcional)</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Gerar automaticamente"
                    minLength={6}
                    className={inputClass}
                  />
                </div>
              )}
              {canChangeRole && (
                <div>
                  <label className="text-sm text-text-muted">Papel</label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(Number(e.target.value))}
                    className={inputClass}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {isAdminViewer && (
              <label className="inline-flex items-center gap-2 text-sm text-text-main cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={isPontaFirme}
                  onChange={(e) => setIsPontaFirme(e.target.checked)}
                  className="accent-primary"
                />
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <BadgeCheck size={15} className={isPontaFirme ? 'text-primary' : 'text-text-muted'} />
                  Ponta Firme
                </span>
              </label>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>

          <div className="px-5 py-3 border-t border-border flex justify-end shrink-0">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 transition disabled:opacity-60"
            >
              <Send size={15} />
              {saving ? 'Salvando...' : mode === 'create' ? 'Cadastrar membro' : 'Salvar alterações'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
