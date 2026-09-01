import { motion } from 'framer-motion';
import { ImageIcon, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { PrivateLayout } from '../components/PrivateLayout';
import { UPLOADS_BASE } from '../lib/config';

interface GallerySummary {
  id: number;
  title: string;
  year: number;
  coverUrl: string | null;
  imageCount: number;
}


export function GalleryListPage() {
  const [galleries, setGalleries] = useState<GallerySummary[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<GallerySummary[]>('/galleries').then(setGalleries);
  }, []);

  const filtered = galleries.filter((g) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return g.title.toLowerCase().includes(term) || String(g.year).includes(term);
  });

  return (
    <PrivateLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="font-display uppercase tracking-wider text-2xl text-text-main">Galeria Histórica</h1>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou ano..."
              className="pl-9 pr-3 py-2 text-sm rounded-full border border-border outline-none focus:border-primary w-64 max-w-full"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-border p-14 flex flex-col items-center gap-2 text-text-muted">
            <ImageIcon size={28} />
            <p className="text-sm">Nenhum álbum encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filtered.map((g) => (
              <motion.div key={g.id} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                <Link
                  to={`/galeria/${g.id}`}
                  className="block bg-white rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-square bg-card-subtle flex items-center justify-center">
                    {g.coverUrl ? (
                      <img
                        src={`${UPLOADS_BASE}${g.coverUrl}`}
                        alt={g.title}
                        className="w-full h-full object-cover"
                      />
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
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PrivateLayout>
  );
}
