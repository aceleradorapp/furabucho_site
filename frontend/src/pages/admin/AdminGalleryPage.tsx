import { ImageIcon, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { PrivateLayout } from '../../components/PrivateLayout';

interface GallerySummary {
  id: number;
  title: string;
  year: number;
  coverUrl: string | null;
  imageCount: number;
}

const UPLOADS_BASE = 'http://localhost:4321';
const currentYear = new Date().getFullYear();

export function AdminGalleryPage() {
  const [galleries, setGalleries] = useState<GallerySummary[]>([]);
  const [titleFilter, setTitleFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newYear, setNewYear] = useState(currentYear);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (titleFilter) params.set('title', titleFilter);
    if (yearFilter) params.set('year', yearFilter);
    const query = params.toString();
    const data = await api.get<GallerySummary[]>(`/galleries${query ? `?${query}` : ''}`);
    setGalleries(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleFilter, yearFilter]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/galleries', { title: newTitle, year: newYear });
      setNewTitle('');
      setNewYear(currentYear);
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o álbum');
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`/galleries/${id}`);
    setGalleries((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <PrivateLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="font-display uppercase tracking-wider text-2xl text-text-main">Gerenciar Galeria</h1>
          <button
            onClick={() => setCreating((v) => !v)}
            className="flex items-center gap-1.5 text-sm rounded-full bg-primary hover:bg-primary-hover text-white px-4 py-2 transition"
          >
            <Plus size={16} /> Novo álbum
          </button>
        </div>

        {creating && (
          <form onSubmit={handleCreate} className="bg-white border border-border rounded-2xl p-4 mb-6 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-text-muted">Título</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                placeholder="Ex: Encontro 2024"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Ano</label>
              <input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
                required
                className="mt-1 w-28 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              className="text-sm rounded-full bg-accent-dark text-white px-5 py-2 transition"
            >
              Criar álbum
            </button>
            {error && <p className="text-sm text-red-600 w-full">{error}</p>}
          </form>
        )}

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              placeholder="Filtrar por título"
              className="pl-9 pr-3 py-2 text-sm rounded-full border border-border outline-none focus:border-primary w-56"
            />
          </div>
          <input
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            placeholder="Ano"
            className="px-3 py-2 text-sm rounded-full border border-border outline-none focus:border-primary w-24"
          />
        </div>

        {galleries.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhum álbum encontrado.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {galleries.map((g) => (
              <div key={g.id} className="relative bg-white rounded-2xl overflow-hidden border border-border">
                <Link to={`/admin/galeria/${g.id}`} className="block">
                  <div className="aspect-square bg-card-subtle flex items-center justify-center">
                    {g.coverUrl ? (
                      <img src={`${UPLOADS_BASE}${g.coverUrl}`} alt={g.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-text-muted" size={28} />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-text-main truncate">{g.title}</p>
                    <p className="text-xs text-text-muted">
                      {g.year} · {g.imageCount} {g.imageCount === 1 ? 'foto' : 'fotos'}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-red-600 transition"
                  aria-label="Excluir álbum"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PrivateLayout>
  );
}
