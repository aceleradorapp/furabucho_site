import { Check, CheckCircle2, FolderInput, ImageIcon, Trash2, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { PrivateLayout } from '../../components/PrivateLayout';
import { UPLOADS_BASE } from '../../lib/config';

interface PioneiroPhoto {
  id: number;
  title: string;
  imageUrl: string;
  createdAt: string;
  sentAt: string | null;
  pioneiro: { id: number; name: string };
}

interface GallerySummary {
  id: number;
  title: string;
  year: number;
}

const currentYear = new Date().getFullYear();

export function AdminPioneiroPhotosPage() {
  const confirm = useConfirm();
  const [photos, setPhotos] = useState<PioneiroPhoto[]>([]);
  const [galleries, setGalleries] = useState<GallerySummary[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sendMode, setSendMode] = useState(false);
  const [targetGalleryId, setTargetGalleryId] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [newYear, setNewYear] = useState(currentYear);
  const [sending, setSending] = useState(false);

  async function load() {
    const [photosData, galleriesData] = await Promise.all([
      api.get<PioneiroPhoto[]>('/admin/pioneiros/photos'),
      api.get<GallerySummary[]>('/galleries'),
    ]);
    setPhotos(photosData);
    setGalleries(galleriesData);
  }

  useEffect(() => {
    load();
  }, []);

  const byPioneiro = useMemo(() => {
    const map = new Map<number, { name: string; photos: PioneiroPhoto[] }>();
    for (const photo of photos) {
      const entry = map.get(photo.pioneiro.id) ?? { name: photo.pioneiro.name, photos: [] };
      entry.photos.push(photo);
      map.set(photo.pioneiro.id, entry);
    }
    return Array.from(map.entries())
      .map(([id, data]) => ({ pioneiroId: id, ...data }))
      .sort((a, b) => {
        const aLatest = Math.max(...a.photos.map((p) => new Date(p.createdAt).getTime()));
        const bLatest = Math.max(...b.photos.map((p) => new Date(p.createdAt).getTime()));
        return bLatest - aLatest;
      });
  }, [photos]);

  function groupByTitle(list: PioneiroPhoto[]): [string, PioneiroPhoto[]][] {
    const map = new Map<string, PioneiroPhoto[]>();
    for (const photo of list) {
      const group = map.get(photo.title) ?? [];
      group.push(photo);
      map.set(photo.title, group);
    }
    return Array.from(map.entries());
  }

  function toggle(photo: PioneiroPhoto) {
    if (photo.sentAt) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photo.id)) next.delete(photo.id);
      else next.add(photo.id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Excluir ${selected.size} foto${selected.size === 1 ? '' : 's'}?`,
      description: 'Isso remove a foto da lista de moderação. Os pontos já ganhos pela pessoa não são afetados.',
      variant: 'danger',
    });
    if (!ok) return;
    await Promise.all(Array.from(selected).map((id) => api.delete(`/admin/pioneiros/photos/${id}`)));
    setPhotos((prev) => prev.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
  }

  async function handleSendToGallery() {
    if (selected.size === 0) return;
    setSending(true);
    try {
      await api.post('/admin/pioneiros/photos/send-to-gallery', {
        photoIds: Array.from(selected),
        galleryId: targetGalleryId ? Number(targetGalleryId) : undefined,
        newGallery: targetGalleryId ? undefined : { title: newTitle, year: newYear },
      });
      setSelected(new Set());
      setSendMode(false);
      setNewTitle('');
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <PrivateLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 pb-28">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2">
          Fotos do Programa Pioneiros
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Organizado por quem enviou. Selecione as fotos de um evento e envie pra galeria oficial, ou exclua as que
          não servem. Fotos já enviadas ficam em cinza, só pra registro.
        </p>

        {byPioneiro.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted">
            <ImageIcon size={32} className="text-border" />
            <p className="text-sm">Nenhuma foto enviada ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {byPioneiro.map(({ pioneiroId, name, photos: pioneiroPhotos }) => (
              <div key={pioneiroId} className="border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2.5 bg-card-subtle px-4 py-3 border-b border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserRound size={15} className="text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-text-main">{name}</p>
                  <span className="text-xs text-text-muted">
                    {pioneiroPhotos.length} foto{pioneiroPhotos.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="flex flex-col gap-5 p-4">
                  {groupByTitle(pioneiroPhotos).map(([title, group]) => (
                    <div key={title}>
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{title}</p>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                        {group.map((photo) => {
                          const isSelected = selected.has(photo.id);
                          const isSent = !!photo.sentAt;
                          return (
                            <button
                              key={photo.id}
                              onClick={() => toggle(photo)}
                              disabled={isSent}
                              title={isSent ? 'Já enviada pra galeria' : undefined}
                              className={`relative aspect-square rounded-xl overflow-hidden ${isSent ? 'cursor-default' : ''}`}
                            >
                              <img
                                src={`${UPLOADS_BASE}${photo.imageUrl}`}
                                alt={title}
                                className={`w-full h-full object-cover transition ${isSent ? 'grayscale opacity-40' : ''}`}
                              />
                              {!isSent && (
                                <div
                                  className={`absolute inset-0 transition-colors ${
                                    isSelected ? 'bg-primary/30' : 'bg-black/0 hover:bg-black/20'
                                  }`}
                                />
                              )}
                              {isSent ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="inline-flex items-center gap-1 bg-black/70 text-white text-[10px] font-semibold rounded-full px-2 py-1">
                                    <CheckCircle2 size={11} /> Enviada
                                  </span>
                                </div>
                              ) : (
                                <div
                                  className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center border-2 transition ${
                                    isSelected ? 'bg-primary border-primary' : 'bg-black/40 border-white/70'
                                  }`}
                                >
                                  {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
          <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col gap-3">
            {sendMode ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs text-text-muted">Álbum existente</label>
                  <select
                    value={targetGalleryId}
                    onChange={(e) => setTargetGalleryId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Criar novo álbum...</option>
                    {galleries.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.year})
                      </option>
                    ))}
                  </select>
                </div>
                {!targetGalleryId && (
                  <>
                    <div className="flex-1 min-w-[160px]">
                      <label className="text-xs text-text-muted">Título do novo álbum</label>
                      <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ex: Fotos dos Pioneiros"
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Ano</label>
                      <input
                        type="number"
                        value={newYear}
                        onChange={(e) => setNewYear(Number(e.target.value))}
                        className="mt-1 w-24 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  </>
                )}
                <button
                  onClick={handleSendToGallery}
                  disabled={sending || (!targetGalleryId && !newTitle.trim())}
                  className="rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 transition"
                >
                  {sending ? 'Enviando...' : 'Confirmar'}
                </button>
                <button
                  onClick={() => setSendMode(false)}
                  className="rounded-full border border-border text-text-muted text-sm px-4 py-2 transition"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-text-muted">{selected.size} selecionada(s)</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSendMode(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2 transition"
                  >
                    <FolderInput size={15} /> Enviar pra galeria
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 text-sm px-4 py-2 transition"
                  >
                    <Trash2 size={15} /> Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PrivateLayout>
  );
}
