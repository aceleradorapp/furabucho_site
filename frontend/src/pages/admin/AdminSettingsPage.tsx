import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../../api/client';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { ImageUploadButton } from '../../components/ImageUploadButton';
import { PrivateLayout } from '../../components/PrivateLayout';
import { SaveStatusBadge, type SaveStatus } from '../../components/SaveStatusBadge';
import { UPLOADS_BASE } from '../../lib/config';
import { IMAGE_SPECS } from '../../lib/imageSpecs';

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

const AUTOSAVE_DELAY = 900;
const STATUS_RESET_DELAY = 2200;
const inputClass =
  'w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary transition text-sm';

export function AdminSettingsPage() {
  const confirm = useConfirm();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [bannerStatus, setBannerStatus] = useState<Record<number, SaveStatus>>({});

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const pendingBannerPatchesRef = useRef<Map<number, Partial<Pick<Banner, 'title' | 'subtitle'>>>>(new Map());

  useEffect(() => {
    api.get<SiteSettings>('/settings').then(setSettings);
    api.get<Banner[]>('/banners').then(setBanners);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (statusResetRef.current) clearTimeout(statusResetRef.current);
      bannerTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const persistSettings = useCallback(async (next: SiteSettings) => {
    setStatus('saving');
    try {
      const updated = await api.put<SiteSettings>('/settings', {
        siteName: next.siteName,
        subtitle: next.subtitle,
        foundingYear: next.foundingYear,
        heroTitle: next.heroTitle,
        aboutText: next.aboutText,
      });
      setSettings(updated);
      window.dispatchEvent(new Event('site-settings-updated'));
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      if (statusResetRef.current) clearTimeout(statusResetRef.current);
      statusResetRef.current = setTimeout(() => setStatus('idle'), STATUS_RESET_DELAY);
    }
  }, []);

  function updateField(patch: Partial<SiteSettings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => persistSettings(next), AUTOSAVE_DELAY);
  }

  async function handleUploadLogo(blob: Blob) {
    const form = new FormData();
    form.append('image', blob, 'logo.jpg');
    const updated = await api.post<SiteSettings>('/settings/logo', form);
    setSettings(updated);
    window.dispatchEvent(new Event('site-settings-updated'));
  }

  async function handleRemoveLogo() {
    if (!settings) return;
    if (!(await confirm({ title: 'Remover o logo do site?', variant: 'danger' }))) return;
    const updated = await api.put<SiteSettings>('/settings', { logoUrl: null });
    setSettings(updated);
    window.dispatchEvent(new Event('site-settings-updated'));
  }

  async function handleUploadHero(blob: Blob) {
    const form = new FormData();
    form.append('image', blob, 'hero.jpg');
    const updated = await api.post<SiteSettings>('/settings/hero-image', form);
    setSettings(updated);
    window.dispatchEvent(new Event('site-settings-updated'));
  }

  async function handleRemoveHero() {
    if (!settings) return;
    if (!(await confirm({ title: 'Remover a imagem do Hero?', variant: 'danger' }))) return;
    const updated = await api.put<SiteSettings>('/settings', { heroImageUrl: null });
    setSettings(updated);
    window.dispatchEvent(new Event('site-settings-updated'));
  }

  async function persistBannerPatch(id: number, patch: Partial<Pick<Banner, 'title' | 'subtitle' | 'active' | 'order'>>) {
    setBannerStatus((prev) => ({ ...prev, [id]: 'saving' }));
    try {
      const updated = await api.patch<Banner>(`/banners/${id}`, patch);
      setBanners((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setBannerStatus((prev) => ({ ...prev, [id]: 'saved' }));
    } catch {
      setBannerStatus((prev) => ({ ...prev, [id]: 'error' }));
    } finally {
      setTimeout(() => setBannerStatus((prev) => ({ ...prev, [id]: 'idle' })), STATUS_RESET_DELAY);
    }
  }

  function updateBannerField(id: number, patch: Partial<Pick<Banner, 'title' | 'subtitle'>>) {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

    const pending = { ...pendingBannerPatchesRef.current.get(id), ...patch };
    pendingBannerPatchesRef.current.set(id, pending);

    const existing = bannerTimeoutsRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => {
      const toSave = pendingBannerPatchesRef.current.get(id);
      pendingBannerPatchesRef.current.delete(id);
      if (toSave) persistBannerPatch(id, toSave);
    }, AUTOSAVE_DELAY);
    bannerTimeoutsRef.current.set(id, timeout);
  }

  async function handleUploadBanner(blob: Blob) {
    const form = new FormData();
    form.append('image', blob, 'banner.jpg');
    form.append('order', String(banners.length));
    const created = await api.post<Banner>('/banners', form);
    setBanners((prev) => [...prev, created]);
  }

  function handleToggleActive(banner: Banner) {
    persistBannerPatch(banner.id, { active: !banner.active });
  }

  function handleMoveBanner(banner: Banner, direction: 'up' | 'down') {
    const sorted = [...banners].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((b) => b.id === banner.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const other = sorted[swapIndex];
    const bannerOrder = banner.order;
    const otherOrder = other.order;

    setBanners((prev) =>
      prev.map((b) => {
        if (b.id === banner.id) return { ...b, order: otherOrder };
        if (b.id === other.id) return { ...b, order: bannerOrder };
        return b;
      }),
    );
    persistBannerPatch(banner.id, { order: otherOrder });
    persistBannerPatch(other.id, { order: bannerOrder });
  }

  async function handleDeleteBanner(id: number) {
    if (!(await confirm({ title: 'Excluir este banner?', description: 'Essa ação não pode ser desfeita.', variant: 'danger' })))
      return;
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

  const sortedBanners = [...banners].sort((a, b) => a.order - b.order);

  return (
    <PrivateLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display uppercase tracking-wider text-2xl text-text-main">Configurações do Site</h1>
            <p className="text-sm text-text-muted mt-1">
              As alterações são salvas automaticamente enquanto você edita.
            </p>
          </div>
          <SaveStatusBadge status={status} />
        </div>

        <SettingsSection title="Identidade" description="Nome e logo exibidos no cabeçalho de todo o site.">
          <div className="flex flex-col sm:flex-row gap-5">
            <ImageTile
              label="Logo"
              imageUrl={settings.logoUrl}
              imageClassName="h-16 object-contain"
              uploadSpec={IMAGE_SPECS.logo}
              onUpload={handleUploadLogo}
              onRemove={settings.logoUrl ? handleRemoveLogo : undefined}
            />

            <div className="flex-1 flex flex-col gap-4">
              <Field label="Nome do site">
                <input
                  value={settings.siteName}
                  onChange={(e) => updateField({ siteName: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <Field label="Subtítulo">
                <input
                  value={settings.subtitle ?? ''}
                  onChange={(e) => updateField({ subtitle: e.target.value })}
                  placeholder="Desde 2010 • Tradição & Família"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Página Inicial (Hero)" description="A primeira seção que os visitantes veem na landing page.">
          <div className="flex flex-col gap-5">
            <ImageTile
              label="Imagem do Hero"
              imageUrl={settings.heroImageUrl}
              imageClassName="h-24 w-full object-cover"
              wide
              uploadSpec={IMAGE_SPECS.hero}
              onUpload={handleUploadHero}
              onRemove={settings.heroImageUrl ? handleRemoveHero : undefined}
            />

            <Field label="Título do Hero">
              <input
                value={settings.heroTitle ?? ''}
                onChange={(e) => updateField({ heroTitle: e.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label="Ano de fundação" hint="Usado no selo do Hero e no contador de anos da seção Sobre Nós.">
              <input
                type="number"
                value={settings.foundingYear ?? ''}
                onChange={(e) => updateField({ foundingYear: e.target.value ? Number(e.target.value) : null })}
                className={`${inputClass} max-w-[160px]`}
              />
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection title="Sobre Nós" description="Texto exibido na seção 'A Família Fura-Bucho' da landing page.">
          <Field label="Texto">
            <textarea
              value={settings.aboutText ?? ''}
              onChange={(e) => updateField({ aboutText: e.target.value })}
              rows={4}
              className={inputClass}
            />
          </Field>
        </SettingsSection>

        <SettingsSection
          title="Banners do Carrossel"
          description="Aparecem na home. Use as setas para reordenar e o ícone de olho para ocultar sem excluir."
          headerAction={
            <ImageUploadButton
              spec={IMAGE_SPECS.banner}
              buttonLabel={
                <span className="inline-flex items-center gap-1.5">
                  <Plus size={14} /> Adicionar
                </span>
              }
              onUpload={handleUploadBanner}
              className="text-sm font-medium rounded-full bg-primary hover:bg-primary-hover text-white px-4 py-1.5 transition disabled:opacity-60"
            />
          }
        >
          {sortedBanners.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-text-muted">
              <ImagePlus size={32} className="text-border" />
              <p className="text-sm">Nenhum banner cadastrado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedBanners.map((b, index) => (
                <div
                  key={b.id}
                  className={`relative bg-card-subtle rounded-xl overflow-hidden border border-border transition ${
                    b.active ? '' : 'opacity-60'
                  }`}
                >
                  <div className="relative aspect-[21/9] bg-black/5">
                    <img src={`${UPLOADS_BASE}${b.imageUrl}`} alt={b.title ?? ''} className="w-full h-full object-cover" />

                    {!b.active && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide bg-black/70 text-white rounded-full px-2 py-0.5">
                        Oculto
                      </span>
                    )}

                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <IconButton
                        icon={<ArrowUp size={13} />}
                        label="Mover para cima"
                        onClick={() => handleMoveBanner(b, 'up')}
                        disabled={index === 0}
                      />
                      <IconButton
                        icon={<ArrowDown size={13} />}
                        label="Mover para baixo"
                        onClick={() => handleMoveBanner(b, 'down')}
                        disabled={index === sortedBanners.length - 1}
                      />
                      <IconButton
                        icon={b.active ? <Eye size={13} /> : <EyeOff size={13} />}
                        label={b.active ? 'Ocultar banner' : 'Exibir banner'}
                        onClick={() => handleToggleActive(b)}
                      />
                      <IconButton
                        icon={<Trash2 size={13} />}
                        label="Excluir banner"
                        onClick={() => handleDeleteBanner(b.id)}
                        variant="danger"
                      />
                    </div>
                  </div>

                  <div className="p-3 flex flex-col gap-1.5">
                    <input
                      value={b.title ?? ''}
                      placeholder="Título do banner"
                      onChange={(e) => updateBannerField(b.id, { title: e.target.value })}
                      className="text-sm rounded-lg border border-border px-2 py-1 outline-none focus:border-primary transition"
                    />
                    <input
                      value={b.subtitle ?? ''}
                      placeholder="Subtítulo (opcional)"
                      onChange={(e) => updateBannerField(b.id, { subtitle: e.target.value })}
                      className="text-xs rounded-lg border border-border px-2 py-1 outline-none focus:border-primary transition"
                    />
                    <div className="h-4">
                      <SaveStatusBadge status={bannerStatus[b.id] ?? 'idle'} compact />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SettingsSection>
      </div>
    </PrivateLayout>
  );
}

function SettingsSection({
  title,
  description,
  headerAction,
  children,
}: {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-display uppercase tracking-wider text-base text-text-main">{title}</h2>
          {description && <p className="text-xs text-text-muted mt-1">{description}</p>}
        </div>
        {headerAction}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-sm text-text-muted font-medium">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-xs text-text-muted/80 mt-1">{hint}</p>}
    </div>
  );
}

function ImageTile({
  label,
  imageUrl,
  imageClassName,
  wide,
  uploadSpec,
  onUpload,
  onRemove,
}: {
  label: string;
  imageUrl: string | null;
  imageClassName: string;
  wide?: boolean;
  uploadSpec: (typeof IMAGE_SPECS)[keyof typeof IMAGE_SPECS];
  onUpload: (blob: Blob) => Promise<void>;
  onRemove?: () => void;
}) {
  return (
    <div className={`bg-card-subtle rounded-2xl p-4 ${wide ? 'w-full' : 'w-full sm:w-48 shrink-0'}`}>
      <p className="text-sm text-text-muted mb-2">{label}</p>
      {imageUrl && (
        <div className="relative mb-3 group">
          <img src={`${UPLOADS_BASE}${imageUrl}`} alt={label} className={`${imageClassName} rounded-lg`} />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              title="Remover imagem"
              className="absolute -top-2 -right-2 bg-white text-red-600 border border-border rounded-full p-1 shadow-sm hover:bg-red-50 transition"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}
      <ImageUploadButton
        spec={uploadSpec}
        buttonLabel={
          <span className="inline-flex items-center gap-1.5">
            <ImagePlus size={14} /> {imageUrl ? 'Trocar' : 'Adicionar'}
          </span>
        }
        onUpload={onUpload}
        className="text-sm font-medium rounded-full border border-border px-4 py-1.5 hover:border-primary hover:text-primary transition disabled:opacity-60"
      />
    </div>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  disabled,
  variant = 'default',
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-full backdrop-blur-md transition disabled:opacity-30 disabled:cursor-not-allowed ${
        variant === 'danger'
          ? 'bg-black/60 text-white hover:bg-red-600'
          : 'bg-black/60 text-white hover:bg-black/80'
      }`}
    >
      {icon}
    </button>
  );
}
