import * as Dialog from '@radix-ui/react-dialog';
import { Image as ImageIcon, Video, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from './Avatar';

const MAX_MEDIA_SIZE = 25 * 1024 * 1024;

export function PostComposerModal({
  open,
  onOpenChange,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished: () => void;
}) {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<'image' | 'video' | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setCaption('');
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setMediaKind(null);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next && !posting) reset();
    onOpenChange(next);
  }

  function handlePickFile(selected: File, kind: 'image' | 'video') {
    if (selected.size > MAX_MEDIA_SIZE) {
      setError(`Arquivo muito grande. O limite é ${MAX_MEDIA_SIZE / 1024 / 1024}MB.`);
      return;
    }
    setError(null);
    setFile(selected);
    setMediaKind(kind);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function handleRemoveMedia() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setMediaKind(null);
  }

  async function handleSubmit() {
    if (!file && !caption.trim()) {
      setError('Escreva algo ou anexe uma foto/vídeo');
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const form = new FormData();
      if (file) form.append('media', file);
      form.append('caption', caption);
      await api.post('/posts', form);
      reset();
      onOpenChange(false);
      onPublished();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível publicar');
    } finally {
      setPosting(false);
    }
  }

  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl focus:outline-none flex flex-col max-h-[88vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <Dialog.Title className="font-semibold text-text-main">Nova publicação</Dialog.Title>
            <Dialog.Close className="text-text-muted hover:text-text-main transition" aria-label="Fechar">
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="px-5 py-4 overflow-y-auto flex-1">
            <div className="flex items-center gap-2.5 mb-3">
              <Avatar name={user?.name ?? ''} avatarUrl={user?.avatarUrl} size={36} />
              <p className="text-sm font-medium text-text-main">{user?.name}</p>
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={`No que você está pensando, ${firstName}?`}
              rows={mediaKind ? 2 : 4}
              autoFocus
              className="w-full resize-none outline-none text-[15px] text-text-main placeholder:text-text-muted mb-3"
            />

            {previewUrl && (
              <div className="relative rounded-xl overflow-hidden bg-black mb-1 border border-border">
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition"
                  aria-label="Remover mídia"
                >
                  <X size={16} />
                </button>
                {mediaKind === 'image' ? (
                  <img src={previewUrl} alt="Pré-visualização" className="w-full max-h-[45vh] object-contain" />
                ) : (
                  <video src={previewUrl} controls className="w-full max-h-[45vh]" />
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>

          <div className="px-5 py-3 border-t border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePickFile(e.target.files[0], 'image')}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePickFile(e.target.files[0], 'video')}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={!!file}
                className="p-2 rounded-full text-green-600 hover:bg-green-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Adicionar foto"
              >
                <ImageIcon size={22} />
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={!!file}
                className="p-2 rounded-full text-purple-600 hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Adicionar vídeo"
              >
                <Video size={22} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={posting || (!file && !caption.trim())}
              className="rounded-full bg-primary hover:bg-primary-hover text-white font-semibold text-sm px-6 py-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {posting ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
