import useEmblaCarousel from 'embla-carousel-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  ChevronRight,
  Flame,
  Heart,
  ImageIcon,
  Lock,
  Sparkles,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { InstallAppButton } from '../components/InstallAppButton';
import { LoginModal } from '../components/LoginModal';
import { PioneirosPrompt } from '../components/PioneirosPrompt';
import { useAuth } from '../auth/AuthContext';
import { UPLOADS_BASE } from '../lib/config';

interface SiteSettings {
  siteName: string;
  subtitle: string | null;
  foundingYear: number | null;
  logoUrl: string | null;
  heroTitle: string | null;
  heroImageUrl: string | null;
  aboutText: string | null;
  pioneirosCampaignActive: boolean;
}

interface Banner {
  id: number;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  active: boolean;
}

interface HighlightImage {
  id: number;
  imageUrl: string;
  galleryTitle: string;
  galleryYear: number;
}

interface ShowcaseMember {
  id: number;
  name: string;
  nickname: string | null;
  caricatureUrl: string | null;
}

export function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loginOpen, setLoginOpen] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [highlights, setHighlights] = useState<HighlightImage[]>([]);
  const [members, setMembers] = useState<ShowcaseMember[]>([]);

  useEffect(() => {
    if (searchParams.get('login')) {
      setLoginOpen(true);
      searchParams.delete('login');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    // Quem abre o site (ou o app instalado) já logado não deveria cair na landing
    // publica de novo — isso que fazia parecer que era preciso logar toda vez.
    if (!loading && user) navigate('/feed', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    api.get<SiteSettings>('/settings').then(setSettings);
    api.get<Banner[]>('/banners').then((data) => setBanners(data.filter((b) => b.active)));
    api.get<HighlightImage[]>('/galleries/featured').then(setHighlights);
    api.get<ShowcaseMember[]>('/settings/members-showcase').then(setMembers);
  }, []);

  const siteName = settings?.siteName ?? 'Amigos Fura-Bucho';
  const subtitle = settings?.subtitle ?? 'Tradição, Risadas & Resenha';
  const heroTitle = settings?.heroTitle ?? 'TRADIÇÃO, RISADAS & UNIÃO';

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 flex flex-col font-sans selection:bg-[#FF5E14] selection:text-white">
      
      {/* ================= NAVBAR FULL-WIDTH ================= */}
      <nav className="sticky top-0 z-50 w-full bg-[#0A0A0C]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {settings?.logoUrl ? (
              <img
                src={`${UPLOADS_BASE}${settings.logoUrl}`}
                alt={siteName}
                className="w-11 h-11 rounded-xl object-cover ring-1 ring-orange-500/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5E14] to-[#E03A00] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-500/20">
                FB
              </div>
            )}
            <div>
              <p className="font-extrabold text-white text-base sm:text-lg leading-tight tracking-tight">{siteName}</p>
              <p className="text-[11px] font-medium text-zinc-400 leading-tight">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="#eventos" className="hidden md:inline text-sm font-medium text-zinc-400 hover:text-white transition">
              Encontros
            </a>
            <a href="#sobre" className="hidden md:inline text-sm font-medium text-zinc-400 hover:text-white transition">
              Sobre Nós
            </a>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center gap-2 bg-[#FF5E14] hover:bg-[#E04D0B] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-orange-600/30 transition duration-200"
            >
              <Lock size={14} />
              <span>Área do Membro</span>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ================= HERO SECTION FULL-SCREEN ================= */}
      <section className="relative w-full min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 py-20">
        {/* Background Imagem & Gradiente */}
        {settings?.heroImageUrl ? (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${UPLOADS_BASE}${settings.heroImageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-[#120524] via-[#0A0A0C] to-[#2E0B02]" />
        )}
        
        {/* Camada de Escurecimento & Iluminação Neon */}
        <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF5E14]/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
          {settings?.foundingYear && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-6"
            >
              <Sparkles size={14} />
              <span>Reencontro Oficial Desde {settings.foundingYear}</span>
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight text-white leading-[1.05] drop-shadow-2xl"
          >
            {heroTitle}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-zinc-300 text-base sm:text-lg md:text-xl max-w-2xl mt-6 font-normal leading-relaxed"
          >
            Mais que uma festa anual, uma tradição inquebrável. O espaço oficial para manter as resenhas, fotos e datas da família viva.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <a
              href="#eventos"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#FF5E14] hover:bg-[#E04D0B] text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-orange-600/30 transition transform hover:-translate-y-0.5 text-sm sm:text-base"
            >
              <Calendar size={18} />
              <span>Ver Próximos Encontros</span>
            </a>
            <button
              onClick={() => setLoginOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-7 py-4 rounded-xl backdrop-blur-md border border-white/10 transition text-sm sm:text-base"
            >
              <span>Acessar o Feed</span>
              <ChevronRight size={16} />
            </button>
          </motion.div>

          <InstallAppButton
            dialogTheme="dark"
            className="mt-5 inline-flex items-center gap-2 text-zinc-400 hover:text-white text-xs sm:text-sm font-medium transition"
          />
        </div>
      </section>

      {/* ================= SEÇÃO DE EVENTOS & CARROSSEL ================= */}
      <section id="eventos" className="w-full py-24 bg-[#0F0F12] border-t border-white/5 scroll-mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-[#FF5E14] font-black tracking-widest text-xs uppercase mb-2 block">
                Programação & Avisos
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                Eventos & Encontros
              </h2>
            </div>
            <p className="text-zinc-400 text-sm max-w-md">
              Acompanhe os avisos oficiais, datas marcadas e as novidades das nossas confraternizações.
            </p>
          </div>

          <EventsCarousel banners={banners} />
        </div>
      </section>

      {/* ================= SEÇÃO MOMENTOS (GALERIA EM DESTAQUE) ================= */}
      {highlights.length > 0 && (
        <section className="w-full py-24 bg-[#0A0A0C] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <span className="text-[#FF5E14] font-black tracking-widest text-xs uppercase mb-2 block">
                  Nossos Momentos
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                  Direto da Galeria
                </h2>
              </div>
              <p className="text-zinc-400 text-sm max-w-md">
                Um gostinho das nossas confraternizações — a galeria completa é exclusiva pra quem é da família.
              </p>
            </div>

            <HighlightsCarousel images={highlights} />
          </div>
        </section>
      )}

      {/* ================= SEÇÃO MEMBROS ================= */}
      {members.length > 0 && <MembersShowcase members={members} />}

      {/* ================= SEÇÃO SOBRE NÓS ================= */}
      <section id="sobre" className="w-full py-24 bg-[#0A0A0C] border-t border-white/5 scroll-mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7">
              <span className="text-[#FF5E14] font-black tracking-widest text-xs uppercase mb-2 block">
                Nossa História
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
                A Família Fura-Bucho
              </h2>
              <div className="space-y-4 text-zinc-300 text-base sm:text-lg leading-relaxed font-normal">
                <p>
                  {settings?.aboutText ??
                    'Um grupo de amigos de longa data que, ano após ano, se reúne para celebrar a amizade, contar histórias e renovar tradições. Mais que um grupo, uma família escolhida.'}
                </p>
                <p className="text-zinc-400 text-sm sm:text-base">
                  Aqui não existe formalidade. O foco é reunir todo mundo, queimar uma carne, dar boas risadas e manter viva a nossa união através do tempo.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-3 text-orange-400 font-semibold text-sm">
                <Flame size={20} />
                <span>Tradição que não se apaga</span>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
              {settings?.foundingYear && (
                <div className="bg-gradient-to-br from-[#18181D] to-[#121215] p-8 rounded-2xl border border-white/10 shadow-xl">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-xs uppercase tracking-wider font-bold">Tempo de Estrada</span>
                    <Sparkles size={18} className="text-[#FF5E14]" />
                  </div>
                  <p className="text-5xl sm:text-6xl font-black text-white">
                    {new Date().getFullYear() - settings.foundingYear}
                  </p>
                  <p className="text-zinc-400 text-sm mt-1">Anos de pura história e resenha</p>
                </div>
              )}

              <div className="bg-gradient-to-br from-[#1E110A] to-[#120B06] p-8 rounded-2xl border border-orange-500/20 shadow-xl">
                <div className="flex items-center justify-between text-orange-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-bold">Nosso Lema</span>
                  <Users size={18} />
                </div>
                <p className="text-xl font-bold text-white leading-snug mt-2">
                  "Aqui ninguém é convidado, todo mundo é de casa."
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= RODAPÉ ================= */}
      <footer className="mt-auto w-full py-10 bg-[#060608] border-t border-white/5 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {siteName}. Todos os direitos reservados.</p>
          <div className="flex items-center gap-2">
            <span>Desenvolvido exclusivamente para a confraternização</span>
            <Heart size={14} className="text-[#FF5E14] fill-[#FF5E14]" />
          </div>
        </div>
      </footer>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      {settings && !user && <PioneirosPrompt active={settings.pioneirosCampaignActive} />}
    </div>
  );
}

function EventsCarousel({ banners }: { banners: Banner[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
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
    const timer = setInterval(() => {
      if (!hoveringRef.current) emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [emblaApi]);

  if (banners.length === 0) {
    return (
      <div className="bg-[#141418] rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-zinc-500 border border-white/5">
        <ImageIcon size={40} className="text-zinc-600" />
        <p className="text-sm font-medium">Nenhum evento ativo cadastrado no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="overflow-hidden rounded-2xl shadow-2xl bg-[#141418] border border-white/10"
        ref={emblaRef}
        onMouseEnter={() => (hoveringRef.current = true)}
        onMouseLeave={() => (hoveringRef.current = false)}
      >
        <div className="flex">
          {banners.map((banner) => (
            <div key={banner.id} className="relative flex-[0_0_100%] min-w-0 aspect-[16/9] md:aspect-[21/9]">
              <img
                src={`${UPLOADS_BASE}${banner.imageUrl}`}
                alt={banner.title ?? 'Banner do Evento'}
                className="w-full h-full object-cover"
              />
              {(banner.title || banner.subtitle) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-10 md:p-12">
                  {banner.title && (
                    <h3 className="text-white font-black text-2xl sm:text-3xl md:text-4xl tracking-tight">
                      {banner.title}
                    </h3>
                  )}
                  {banner.subtitle && (
                    <p className="text-zinc-300 text-sm sm:text-base md:text-lg mt-1 max-w-xl">
                      {banner.subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <div className="flex justify-center items-center gap-2">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              onClick={() => scrollTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === selectedIndex ? 'w-8 bg-[#FF5E14]' : 'w-2 bg-zinc-700 hover:bg-zinc-600'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HighlightsCarousel({ images }: { images: HighlightImage[] }) {
  const [index, setIndex] = useState(0);
  const hoveringRef = useRef(false);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => {
      if (!hoveringRef.current) setIndex((i) => (i + 1) % images.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [images.length]);

  const current = images[index];

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl bg-[#141418] border border-white/10 aspect-[4/3]"
        onMouseEnter={() => (hoveringRef.current = true)}
        onMouseLeave={() => (hoveringRef.current = false)}
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <motion.img
              src={`${UPLOADS_BASE}${current.imageUrl}`}
              alt={current.galleryTitle}
              initial={{ scale: 1 }}
              animate={{ scale: 1.08 }}
              transition={{ duration: 4.5, ease: 'linear' }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 sm:p-10 md:p-12">
              <p className="text-zinc-300 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                {current.galleryTitle} · {current.galleryYear}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {images.length > 1 && (
        <div className="flex justify-center items-center gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? 'w-8 bg-[#FF5E14]' : 'w-2 bg-zinc-700 hover:bg-zinc-600'
              }`}
              aria-label={`Foto ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MembersShowcase({ members }: { members: ShowcaseMember[] }) {
  return (
    <section className="w-full py-24 bg-[#0F0F12] border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-[#FF5E14] font-black tracking-widest text-xs uppercase mb-2 block">A Turma</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Nossos Membros
          </h2>
          <p className="text-zinc-400 text-sm max-w-md mx-auto mt-4">
            Gente de verdade, com nome e cara — a família que faz o Fura-Bucho acontecer.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-10 sm:gap-x-8">
          {members.map((m, index) => {
            const firstName = m.name.trim().split(/\s+/)[0];
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: (index % 12) * 0.05 }}
                className="flex flex-col items-center gap-3 w-24 sm:w-28"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-lg hover:border-[#FF5E14]/60 transition-colors shrink-0">
                  <img
                    src={`${UPLOADS_BASE}${m.caricatureUrl}`}
                    alt={m.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <p className="text-white text-sm font-semibold leading-tight truncate w-full">{firstName}</p>
                  {m.nickname && (
                    <p className="text-[#FF5E14] text-xs italic leading-tight mt-0.5 truncate w-full">
                      "{m.nickname}"
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}