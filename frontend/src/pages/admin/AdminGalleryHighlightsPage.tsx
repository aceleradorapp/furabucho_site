import { Check, ChevronDown, ImageIcon, Sparkles, UploadCloud, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { PageLoader } from '../../components/PageLoader';
import { PrivateLayout } from '../../components/PrivateLayout';
import { UPLOADS_BASE } from '../../lib/config';

interface GallerySummary {
  id: number;
  title: string;
  year: number;
  coverUrl: string | null;
  imageCount: number;
}

interface GalleryImage {
  id: number;
  imageUrl: string;
  active: boolean;
}

interface HighlightImage {
  id: number;
  imageUrl: string;
  galleryTitle: string;
  galleryYear: number;
}

interface SelectedEntry {
  imageUrl: string;
  galleryTitle: string;
}

export function AdminGalleryHighlightsPage() {
  const [galleries, setGalleries] = useState<GallerySummary[]>([]);
  const [expanded, setExpanded] = useState<Record<number, GalleryImage[] | undefined>>({});
  const [loadingGallery, setLoadingGallery] = useState<number | null>(null);
  const [selected, setSelected] = useState<Map<number, SelectedEntry>>(new Map());
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  async function loadInitial() {
    const [galleriesData, featured] = await Promise.all([
      api.get<GallerySummary[]>('/galleries'),
      api.get<HighlightImage[]>('/galleries/featured'),
    ]);
    setGalleries(galleriesData);
    const map = new Map<number, SelectedEntry>();
    for (const img of featured) {
      map.set(img.id, { imageUrl: img.imageUrl, galleryTitle: img.galleryTitle });
    }
    setSelected(map);
    setSavedIds(new Set(map.keys()));
  }

  useEffect(() => {
    loadInitial().finally(() => setInitialLoading(false));
  }, []);

  const isDirty = useMemo(() => {
    if (selected.size !== savedIds.size) return true;
    for (const id of selected.keys()) if (!savedIds.has(id)) return true;
    return false;
  }, [selected, savedIds]);

  async function toggleGallery(gallery: GallerySummary) {
    if (expanded[gallery.id]) {
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[gallery.id];
        return next;
      });
      return;
    }
    setLoadingGallery(gallery.id);
    try {
      const data = await api.get<{ images: GalleryImage[] }>(`/galleries/${gallery.id}`);
      setExpanded((prev) => ({ ...prev, [gallery.id]: data.images.filter((img) => img.active) }));
    } finally {
      setLoadingGallery(null);
    }
  }

  function toggleImage(image: GalleryImage, galleryTitle: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(image.id)) next.delete(image.id);
      else next.set(image.id, { imageUrl: image.imageUrl, galleryTitle });
      return next;
    });
    setJustSaved(false);
  }

  function removeSelected(id: number) {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setJustSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const imageIds = Array.from(selected.keys());
      await api.put('/galleries/featured', { imageIds });
      setSavedIds(new Set(imageIds));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PrivateLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 pb-28">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display uppercase tracking-wider text-2xl text-text-main">
              Carrossel da Página Inicial
            </h1>
            <p className="text-sm text-text-muted">
              Escolha fotos das galerias pra aparecer em destaque pra quem visita o site, antes de fazer login.
            </p>
          </div>
        </div>

        {/* Seleção atual */}
        <div className="bg-card border border-border rounded-2xl p-5 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-main">
              Selecionadas <span className="text-text-muted font-normal">({selected.size})</span>
            </h2>
          </div>

          {selected.size === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-text-muted">
              <ImageIcon size={28} className="text-border" />
              <p className="text-sm">Nenhuma foto selecionada ainda. Abra um álbum abaixo e escolha as fotos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
              {Array.from(selected.entries()).map(([id, entry]) => (
                <div key={id} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={`${UPLOADS_BASE}${entry.imageUrl}`} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  <button
                    onClick={() => removeSelected(id)}
                    className="absolute top-1.5 right-1.5 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                    aria-label="Remover da seleção"
                    title="Remover da seleção"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Álbuns */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-text-main mb-3">Álbuns</h2>
          <div className="flex flex-col gap-2.5">
            {initialLoading && <PageLoader />}
            {!initialLoading && galleries.map((gallery) => {
              const images = expanded[gallery.id];
              const isOpen = !!images;
              const selectedCountInGallery = images
                ? images.filter((img) => selected.has(img.id)).length
                : 0;

              return (
                <div key={gallery.id} className="border border-border rounded-2xl overflow-hidden bg-card">
                  <button
                    onClick={() => toggleGallery(gallery)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-card-subtle transition"
                  >
                    <div className="w-12 h-12 rounded-xl bg-card-subtle overflow-hidden shrink-0 flex items-center justify-center">
                      {gallery.coverUrl ? (
                        <img
                          src={`${UPLOADS_BASE}${gallery.coverUrl}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon size={18} className="text-text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-main truncate">{gallery.title}</p>
                      <p className="text-xs text-text-muted">
                        {gallery.year} · {gallery.imageCount} {gallery.imageCount === 1 ? 'foto' : 'fotos'}
                        {selectedCountInGallery > 0 && (
                          <span className="text-primary font-medium"> · {selectedCountInGallery} na seleção</span>
                        )}
                      </p>
                    </div>
                    {loadingGallery === gallery.id ? (
                      <span className="text-xs text-text-muted">carregando...</span>
                    ) : (
                      <ChevronDown
                        size={18}
                        className={`text-text-muted shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>

                  {isOpen && (
                    <div className="p-3 pt-0 border-t border-border">
                      {images.length === 0 ? (
                        <p className="text-xs text-text-muted py-4 text-center">
                          Nenhuma foto ativa neste álbum.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5 pt-3">
                          {images.map((img) => {
                            const isChecked = selected.has(img.id);
                            return (
                              <button
                                key={img.id}
                                onClick={() => toggleImage(img, gallery.title)}
                                className="relative aspect-square rounded-xl overflow-hidden group"
                              >
                                <img src={`${UPLOADS_BASE}${img.imageUrl}`} alt="" className="w-full h-full object-cover" />
                                <div
                                  className={`absolute inset-0 transition-colors ${
                                    isChecked ? 'bg-primary/30' : 'bg-black/0 group-hover:bg-black/20'
                                  }`}
                                />
                                <div
                                  className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center border-2 transition ${
                                    isChecked
                                      ? 'bg-primary border-primary'
                                      : 'bg-black/30 border-white/70 group-hover:border-white'
                                  }`}
                                >
                                  {isChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!initialLoading && galleries.length === 0 && (
              <p className="text-sm text-text-muted py-6 text-center">Nenhum álbum cadastrado ainda.</p>
            )}
          </div>
        </div>
      </div>

      {/* Barra de ação fixa */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-text-muted">
            {selected.size} {selected.size === 1 ? 'foto selecionada' : 'fotos selecionadas'}
            {isDirty && <span className="text-primary font-medium"> · alterações não salvas</span>}
            {justSaved && !isDirty && <span className="text-green-600 font-medium"> · salvo!</span>}
          </p>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 transition"
          >
            <UploadCloud size={16} /> {saving ? 'Carregando...' : 'Carregar seleção'}
          </button>
        </div>
      </div>
    </PrivateLayout>
  );
}
