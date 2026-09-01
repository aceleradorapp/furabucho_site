import { ArrowLeft, EyeOff, Eye, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { PrivateLayout } from '../../components/PrivateLayout';

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

const UPLOADS_BASE = 'http://localhost:4321';

export function AdminGalleryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<GalleryDetail | null>(null);
  const [title, setTitle] = useState('');
  const [year, setYear] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const data = await api.get<GalleryDetail>(`/galleries/${id}`);
    setGallery(data);
    setTitle(data.title);
    setYear(data.year);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSaveInfo() {
    await api.patch(`/galleries/${id}`, { title, year });
    await load();
  }

  async function handleUploadImages(files: FileList) {
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append('images', file));
      await api.post(`/galleries/${id}/images`, form);
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleActive(image: GalleryImage) {
    await api.patch(`/galleries/${id}/images/${image.id}`, { active: !image.active });
    await load();
  }

  async function handleDeleteImage(imageId: number) {
    await api.delete(`/galleries/${id}/images/${imageId}`);
    await load();
  }

  async function handleDeleteGallery() {
    await api.delete(`/galleries/${id}`);
    navigate('/admin/galeria');
  }

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
        <Link to="/admin/galeria" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary mb-4">
          <ArrowLeft size={16} /> Voltar
        </Link>

        <div className="bg-white border border-border rounded-2xl p-4 mb-6 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-text-muted">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted">Ano</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1 w-28 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleSaveInfo}
            className="text-sm rounded-full bg-accent-dark text-white px-5 py-2 transition"
          >
            Salvar
          </button>
          <button
            onClick={handleDeleteGallery}
            className="text-sm rounded-full border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 transition ml-auto"
          >
            Excluir álbum
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-text-main">Fotos ({gallery.images.length})</h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUploadImages(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-sm rounded-full bg-primary hover:bg-primary-hover text-white px-4 py-2 transition disabled:opacity-60"
            >
              <Upload size={16} /> {uploading ? 'Enviando...' : 'Subir fotos'}
            </button>
          </div>
        </div>
        <p className="text-xs text-text-muted mb-4">
          Envie uma ou várias fotos de uma vez. JPG/PNG, até 8MB cada — mantenha uma boa resolução para a galeria ficar
          bonita, mas evite arquivos gigantes.
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {gallery.images.map((img) => (
            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden group">
              <img
                src={`${UPLOADS_BASE}${img.imageUrl}`}
                alt=""
                className={`w-full h-full object-cover ${!img.active ? 'opacity-40' : ''}`}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => handleToggleActive(img)}
                  className="bg-white/90 rounded-full p-1.5 hover:bg-white"
                  aria-label={img.active ? 'Desabilitar' : 'Habilitar'}
                  title={img.active ? 'Desabilitar' : 'Habilitar'}
                >
                  {img.active ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={() => handleDeleteImage(img.id)}
                  className="bg-white/90 rounded-full p-1.5 hover:bg-red-500 hover:text-white"
                  aria-label="Excluir foto"
                  title="Excluir foto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {!img.active && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">
                  desabilitada
                </span>
              )}
            </div>
          ))}
          {gallery.images.length === 0 && (
            <p className="text-sm text-text-muted col-span-full">Nenhuma foto neste álbum ainda.</p>
          )}
        </div>
      </div>
    </PrivateLayout>
  );
}
