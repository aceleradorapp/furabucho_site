import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { api } from '../api/client';
import { PrivateLayout } from '../components/PrivateLayout';
import { UPLOADS_BASE } from '../lib/config';

interface GalleryImage {
  id: number;
  imageUrl: string;
  active: boolean;
}

interface GalleryDetail {
  id: number;
  title: string;
  year: number;
  images: GalleryImage[];
}


export function GalleryDetailPage() {
  const { id } = useParams();
  const [gallery, setGallery] = useState<GalleryDetail | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    api.get<GalleryDetail>(`/galleries/${id}`).then(setGallery);
  }, [id]);

  if (!gallery) {
    return (
      <PrivateLayout>
        <p className="text-text-muted p-8">Carregando...</p>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/galeria" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary mb-4">
          <ArrowLeft size={16} /> Voltar
        </Link>

        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-1">{gallery.title}</h1>
        <p className="text-sm text-text-muted mb-6">
          {gallery.year} · {gallery.images.length} {gallery.images.length === 1 ? 'foto' : 'fotos'}
        </p>

        {gallery.images.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhuma foto neste álbum ainda.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {gallery.images.map((img, index) => (
              <button
                key={img.id}
                onClick={() => setLightboxIndex(index)}
                className="aspect-square overflow-hidden rounded-lg"
              >
                <img
                  src={`${UPLOADS_BASE}${img.imageUrl}`}
                  alt=""
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <Lightbox
        open={lightboxIndex !== null}
        close={() => setLightboxIndex(null)}
        index={lightboxIndex ?? 0}
        slides={gallery.images.map((img) => ({ src: `${UPLOADS_BASE}${img.imageUrl}` }))}
      />
    </PrivateLayout>
  );
}
