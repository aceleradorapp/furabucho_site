import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import { CalendarHeart, ImageIcon, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { LoginModal } from '../components/LoginModal';
import { UPLOADS_BASE } from '../lib/config';

interface SiteSettings {
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
  active: boolean;
}


export function LandingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loginOpen, setLoginOpen] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    if (searchParams.get('login')) {
      setLoginOpen(true);
      searchParams.delete('login');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.get<SiteSettings>('/settings').then(setSettings);
    api.get<Banner[]>('/banners').then((data) => setBanners(data.filter((b) => b.active)));
  }, []);

  const siteName = settings?.siteName ?? 'Amigos Fura-Bucho';
  const subtitle = settings?.subtitle ?? 'Tradição & Família';
  const heroTitle = settings?.heroTitle ?? 'TRADIÇÃO, RISADAS & UNIÃO';

  return (
    <div className="min-h-svh relative overflow-hidden bg-[radial-gradient(circle_at_15%_15%,#FF8A4C_0%,transparent_45%),radial-gradient(circle_at_85%_-5%,#B32CFF_0%,transparent_40%),linear-gradient(160deg,#FF6827_0%,#FF3D0F_60%,#D6280A_100%)] p-2 sm:p-4 md:p-10">
      <FloatingBlobs />

      <div className="relative w-full max-w-7xl mx-auto bg-card rounded-card md:rounded-card-lg shadow-[0_35px_80px_-20px_rgba(0,0,0,0.4)] px-4 py-4 md:px-10 md:py-8">
        <header className="flex items-center justify-between mb-8 md:mb-12">
          <div className="flex items-center gap-2.5">
            {settings?.logoUrl ? (
              <img
                src={`${UPLOADS_BASE}${settings.logoUrl}`}
                alt={siteName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-xs font-display">
                FB
              </span>
            )}
            <div>
              <p className="font-semibold text-text-main leading-tight">{siteName}</p>
              <p className="text-xs text-text-muted leading-tight">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <a href="#sobre" className="hidden sm:inline text-sm text-text-muted hover:text-primary transition">
              Sobre Nós
            </a>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setLoginOpen(true)}
              className="rounded-full bg-accent-dark text-white text-sm font-medium px-5 py-2 shadow-lg shadow-black/20"
            >
              Entrar
            </motion.button>
          </div>
        </header>

        <Hero heroTitle={heroTitle} heroImageUrl={settings?.heroImageUrl} foundingYear={settings?.foundingYear ?? null} />

        <EventsCarousel banners={banners} />

        <AboutSection aboutText={settings?.aboutText} foundingYear={settings?.foundingYear ?? null} />

        <footer className="text-center text-xs text-text-muted pt-8 mt-4 border-t border-border">
          {siteName} — feito com carinho pela galera.
        </footer>
      </div>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}

function FloatingBlobs() {
  return (
    <>
      <motion.div
        animate={{ y: [0, -20, 0], x: [0, 12, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block absolute top-10 left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, 18, 0], x: [0, -14, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block absolute bottom-16 right-16 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none"
      />
    </>
  );
}

function Hero({
  heroTitle,
  heroImageUrl,
  foundingYear,
}: {
  heroTitle: string;
  heroImageUrl?: string | null;
  foundingYear: number | null;
}) {
  return (
    <section className="relative rounded-[28px] md:rounded-[40px] overflow-hidden min-h-[420px] md:min-h-[580px] bg-gradient-to-br from-[#1c0a30] via-[#5b1e8f] to-primary mb-16 md:mb-24">
      {heroImageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${UPLOADS_BASE}${heroImageUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

      <div
        className="absolute top-0 left-0 w-16 h-16 md:w-24 md:h-24 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at top left, var(--color-card) 0%, var(--color-card) 60%, transparent 61%)',
        }}
      />
      {foundingYear && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute top-3 left-3 md:top-5 md:left-5 inline-flex items-center gap-1.5 bg-accent-dark text-white text-xs px-3 py-1.5 rounded-full"
        >
          <Sparkles size={12} className="text-primary" /> Desde {foundingYear}
        </motion.span>
      )}

      <div
        className="absolute bottom-0 right-0 w-20 h-20 md:w-28 md:h-28 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at bottom right, var(--color-card) 0%, var(--color-card) 60%, transparent 61%)',
        }}
      />
      <motion.a
        href="#eventos"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className="absolute bottom-2 right-2 md:bottom-4 md:right-4 inline-flex items-center gap-2 rounded-full bg-primary text-white text-xs md:text-sm font-medium px-4 py-2 md:px-6 md:py-3 shadow-xl shadow-primary/40"
      >
        <CalendarHeart size={16} /> Ver Próximo Encontro
      </motion.a>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 md:px-16 gap-4">
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="font-display uppercase tracking-wider text-4xl sm:text-5xl md:text-7xl text-center text-white drop-shadow-2xl"
        >
          {heroTitle}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-white/80 text-sm md:text-base text-center max-w-md"
        >
          Amigos de verdade, causos pra contar e um encontro pra chamar de nosso.
        </motion.p>
      </div>
    </section>
  );
}

function EventsCarousel({ banners }: { banners: Banner[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const autoplayRef = useRef<number | null>(null);
  const hoveringRef = useRef(false);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    autoplayRef.current = window.setInterval(() => {
      if (!hoveringRef.current) emblaApi.scrollNext();
    }, 4500);
    return () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    };
  }, [emblaApi]);

  return (
    <motion.section
      id="eventos"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7 }}
      className="mb-16 md:mb-24 scroll-mt-24"
    >
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-primary text-xs font-semibold tracking-wider uppercase mb-1">Não perca</p>
          <h2 className="font-display uppercase tracking-wider text-3xl md:text-4xl text-text-main">
            Eventos & Encontros
          </h2>
        </div>
      </div>

      {banners.length === 0 ? (
        <div className="bg-gradient-to-br from-card-subtle to-primary/5 rounded-3xl p-14 flex flex-col items-center gap-3 text-text-muted border border-dashed border-border">
          <ImageIcon size={32} />
          <p className="text-sm">Nenhum banner cadastrado ainda — cadastre em Configurações.</p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-3xl shadow-2xl shadow-black/10"
          ref={emblaRef}
          onMouseEnter={() => (hoveringRef.current = true)}
          onMouseLeave={() => (hoveringRef.current = false)}
        >
          <div className="flex">
            {banners.map((banner) => (
              <div key={banner.id} className="relative flex-[0_0_100%] min-w-0 aspect-[16/8] md:aspect-[16/6]">
                <img
                  src={`${UPLOADS_BASE}${banner.imageUrl}`}
                  alt={banner.title ?? ''}
                  className="w-full h-full object-cover"
                />
                {(banner.title || banner.subtitle) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex flex-col justify-end p-6 md:p-10">
                    {banner.title && (
                      <p className="text-white font-display uppercase tracking-wide text-2xl md:text-3xl">
                        {banner.title}
                      </p>
                    )}
                    {banner.subtitle && <p className="text-white/85 text-sm md:text-base">{banner.subtitle}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {banners.length > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              onClick={() => scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === selectedIndex ? 'w-7 bg-primary' : 'w-1.5 bg-border'
              }`}
              aria-label={`Ir para banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
}

function AboutSection({ aboutText, foundingYear }: { aboutText?: string | null; foundingYear: number | null }) {
  const years = foundingYear ? new Date().getFullYear() - foundingYear : null;

  return (
    <motion.section
      id="sobre"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7 }}
      className="mb-8 scroll-mt-24 grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12 items-center"
    >
      <div className="md:col-span-3">
        <p className="text-primary text-xs font-semibold tracking-wider uppercase mb-1">Quem somos</p>
        <h2 className="font-display uppercase tracking-wider text-3xl md:text-4xl text-text-main mb-5">
          A Família Fura-Bucho
        </h2>
        <p className="text-text-muted leading-relaxed text-base md:text-lg">
          {aboutText ??
            'Um grupo de amigos de longa data que, ano após ano, se reúne para celebrar a amizade, contar histórias e renovar tradições. Mais que um grupo, uma família escolhida.'}
        </p>
      </div>

      <div className="md:col-span-2 flex flex-col gap-4">
        {years !== null && (
          <div className="bg-gradient-to-br from-accent-dark to-[#2a2a2a] text-white rounded-3xl px-6 py-6 shadow-xl">
            <p className="text-4xl font-display">{years}</p>
            <p className="text-sm text-white/70">anos de tradição e amizade</p>
          </div>
        )}
        <div className="bg-primary/10 rounded-3xl px-6 py-6 border border-primary/20">
          <p className="text-sm text-text-main leading-relaxed">
            "Aqui ninguém é convidado, todo mundo é de casa."
          </p>
        </div>
      </div>
    </motion.section>
  );
}
