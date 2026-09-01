import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { PrivateLayout } from '../../components/PrivateLayout';

interface SiteSettings {
  id: number;
  siteName: string;
  subtitle: string | null;
  foundingYear: number | null;
  logoUrl: string | null;
  heroTitle: string | null;
  heroImageUrl: string | null;
  aboutText: string | null;
}

interface Banner {
  id: number;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  order: number;
  active: boolean;
}

const UPLOADS_BASE = 'http://localhost:4321';

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [s, b] = await Promise.all([
      api.get<SiteSettings>('/settings'),
      api.get<Banner[]>('/banners'),
    ]);
    setSettings(s);
    setBanners(b);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.put<SiteSettings>('/settings', {
        siteName: settings.siteName,
        subtitle: settings.subtitle,
        foundingYear: settings.foundingYear,
        heroTitle: settings.heroTitle,
        aboutText: settings.aboutText,
      });
      setSettings(updated);
      setMessage('Configurações salvas.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadLogo(file: File) {
    const form = new FormData();
    form.append('image', file);
    const updated = await api.post<SiteSettings>('/settings/logo', form);
    setSettings(updated);
  }

  async function handleUploadHero(file: File) {
    const form = new FormData();
    form.append('image', file);
    const updated = await api.post<SiteSettings>('/settings/hero-image', form);
    setSettings(updated);
  }

  async function handleUploadBanner(file: File) {
    const form = new FormData();
    form.append('image', file);
    form.append('order', String(banners.length));
    const created = await api.post<Banner>('/banners', form);
    setBanners((prev) => [...prev, created]);
  }

  async function handleDeleteBanner(id: number) {
    await api.delete(`/banners/${id}`);
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }

  if (!settings) {
    return (
      <PrivateLayout>
        <p className="text-text-muted p-8">Carregando...</p>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-6">
          Configurações do Site
        </h1>

        <form onSubmit={handleSaveInfo} className="flex flex-col gap-4 mb-10">
          <div>
            <label className="text-sm text-text-muted">Nome do site</label>
            <input
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm text-text-muted">Subtítulo</label>
            <input
              value={settings.subtitle ?? ''}
              onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              placeholder="Desde 2010 • Tradição & Família"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm text-text-muted">Ano de fundação</label>
            <input
              type="number"
              value={settings.foundingYear ?? ''}
              onChange={(e) =>
                setSettings({ ...settings, foundingYear: e.target.value ? Number(e.target.value) : null })
              }
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm text-text-muted">Título do Hero</label>
            <input
              value={settings.heroTitle ?? ''}
              onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm text-text-muted">Sobre nós</label>
            <textarea
              value={settings.aboutText ?? ''}
              onChange={(e) => setSettings({ ...settings, aboutText: e.target.value })}
              rows={4}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </div>

          {message && <p className="text-sm text-green-700">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="self-start rounded-full bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 transition disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar informações'}
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-card-subtle rounded-2xl p-4">
            <p className="text-sm text-text-muted mb-2">Logo</p>
            {settings.logoUrl && (
              <img src={`${UPLOADS_BASE}${settings.logoUrl}`} alt="Logo" className="h-16 mb-3 object-contain" />
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUploadLogo(e.target.files[0])}
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              className="text-sm rounded-full border border-border px-4 py-1.5 hover:border-primary"
            >
              Trocar logo
            </button>
          </div>

          <div className="bg-card-subtle rounded-2xl p-4">
            <p className="text-sm text-text-muted mb-2">Imagem do Hero</p>
            {settings.heroImageUrl && (
              <img
                src={`${UPLOADS_BASE}${settings.heroImageUrl}`}
                alt="Hero"
                className="h-24 w-full object-cover rounded-lg mb-3"
              />
            )}
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUploadHero(e.target.files[0])}
            />
            <button
              onClick={() => heroInputRef.current?.click()}
              className="text-sm rounded-full border border-border px-4 py-1.5 hover:border-primary"
            >
              Trocar imagem
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display uppercase tracking-wider text-lg text-text-main">
              Banners do Carrossel
            </h2>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUploadBanner(e.target.files[0])}
            />
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="text-sm rounded-full bg-primary hover:bg-primary-hover text-white px-4 py-1.5 transition"
            >
              Adicionar banner
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {banners.map((b) => (
              <div key={b.id} className="relative bg-card-subtle rounded-xl overflow-hidden">
                <img src={`${UPLOADS_BASE}${b.imageUrl}`} alt={b.title ?? ''} className="w-full h-28 object-cover" />
                <button
                  onClick={() => handleDeleteBanner(b.id)}
                  className="absolute top-2 right-2 text-xs bg-black/60 text-white rounded-full px-2 py-1"
                >
                  remover
                </button>
              </div>
            ))}
            {banners.length === 0 && <p className="text-sm text-text-muted">Nenhum banner cadastrado ainda.</p>}
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
}
