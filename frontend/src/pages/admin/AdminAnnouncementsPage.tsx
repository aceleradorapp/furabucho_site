import { Link2, Loader2, Send, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { ImageUploadButton } from '../../components/ImageUploadButton';
import { PrivateLayout } from '../../components/PrivateLayout';
import { UPLOADS_BASE } from '../../lib/config';
import { IMAGE_SPECS } from '../../lib/imageSpecs';

interface Announcement {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  link: string | null;
  scheduledAt: string;
  author: { id: number; name: string };
}

function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeLocalValue(new Date()));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const data = await api.get<Announcement[]>('/announcements');
    setAnnouncements(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePickImage(blob: Blob) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  }

  function resetForm() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageBlob(null);
    setPreviewUrl(null);
    setTitle('');
    setDescription('');
    setLink('');
    setScheduledAt(toDateTimeLocalValue(new Date()));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!imageBlob) {
      setError('Escolha e recorte uma imagem');
      return;
    }
    if (!title.trim()) {
      setError('Escreva um título');
      return;
    }
    setSending(true);
    try {
      const form = new FormData();
      form.append('image', imageBlob, 'announcement.jpg');
      form.append('title', title);
      if (description.trim()) form.append('description', description);
      if (link.trim()) form.append('link', link);
      form.append('scheduledAt', new Date(scheduledAt).toISOString());
      await api.post('/announcements', form);
      resetForm();
      setMessage('Novidade enviada.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Excluir esta novidade?')) return;
    await api.delete(`/announcements/${id}`);
    await load();
  }

  const isScheduledFuture = new Date(scheduledAt).getTime() > Date.now() + 60_000;

  return (
    <PrivateLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2">Novidades</h1>
        <p className="text-sm text-text-muted mb-6">
          Mensagens em tela cheia que aparecem para todo mundo no feed, com foto, título e link opcional.
        </p>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 mb-10">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-full sm:w-40 shrink-0">
              <p className="text-sm text-text-muted mb-2">Imagem</p>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Pré-visualização"
                  className="w-full aspect-[9/16] object-cover rounded-xl border border-border mb-2"
                />
              )}
              <ImageUploadButton
                spec={IMAGE_SPECS.announcement}
                buttonLabel={previewUrl ? 'Trocar imagem' : 'Escolher imagem'}
                onUpload={handlePickImage}
                className="w-full text-sm rounded-full border border-border px-4 py-1.5 hover:border-primary transition disabled:opacity-60"
              />
              <p className="text-xs text-text-muted mt-1.5">{IMAGE_SPECS.announcement.helpText}</p>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              <div>
                <label className="text-sm text-text-muted">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm text-text-muted">Descrição (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm text-text-muted flex items-center gap-1.5">
                  <Link2 size={13} /> Link (opcional)
                </label>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://... ou /galeria"
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-sm text-text-muted">Data e hora de envio</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
                />
                <p className="text-xs text-text-muted mt-1">
                  {isScheduledFuture
                    ? 'Vai aparecer só a partir dessa data/hora.'
                    : 'Já preenchida com agora — clique em enviar para publicar imediatamente.'}
                </p>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          <button
            type="submit"
            disabled={sending}
            className="self-start inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 transition disabled:opacity-60"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </form>

        <h2 className="font-display uppercase tracking-wider text-lg text-text-main mb-3">Enviadas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {announcements.map((a) => {
            const future = new Date(a.scheduledAt).getTime() > Date.now();
            return (
              <div key={a.id} className="flex gap-3 bg-card-subtle rounded-xl p-3">
                <img
                  src={`${UPLOADS_BASE}${a.imageUrl}`}
                  alt={a.title}
                  className="w-14 aspect-[9/16] object-cover rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-main truncate">{a.title}</p>
                  <p className="text-xs text-text-muted">
                    {future ? 'agendada para ' : 'enviada em '}
                    {new Date(a.scheduledAt).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-text-muted">por {a.author.name}</p>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-text-muted hover:text-red-600 transition self-start p-1"
                  aria-label="Excluir novidade"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
          {announcements.length === 0 && <p className="text-sm text-text-muted">Nenhuma novidade enviada ainda.</p>}
        </div>
      </div>
    </PrivateLayout>
  );
}
