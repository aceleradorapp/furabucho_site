import { motion } from 'framer-motion';
import {
  Camera,
  CheckCircle2,
  Crown,
  Eye,
  Home,
  ImagePlus,
  LogOut,
  MessageSquare,
  Rocket,
  Send,
  Trophy,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { getPioneiroToken, pioneirosApi, setPioneiroToken } from '../api/pioneirosClient';
import { ImageCropModal } from '../components/ImageCropModal';
import { UPLOADS_BASE } from '../lib/config';
import { IMAGE_SPECS } from '../lib/imageSpecs';

interface SiteSettings {
  siteName: string;
  pioneirosCampaignActive: boolean;
}

interface Pioneiro {
  id: number;
  name: string;
  avatarUrl: string | null;
  points: number;
  status: string;
}

interface PioneiroPhoto {
  id: number;
  title: string;
  imageUrl: string;
  createdAt: string;
}

interface PioneiroComment {
  id: number;
  text: string;
  createdAt: string;
}

interface RankingEntry {
  id: number;
  name: string;
  avatarUrl: string | null;
  points: number;
}

interface Stats {
  totalCount: number;
  ranking: RankingEntry[];
}

type Mode = 'loading' | 'own' | 'preview';

export function PioneirosPainelPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [mode, setMode] = useState<Mode>('loading');
  const [pioneiro, setPioneiro] = useState<Pioneiro | null>(null);
  const [photos, setPhotos] = useState<PioneiroPhoto[]>([]);
  const [comments, setComments] = useState<PioneiroComment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [visitBonus, setVisitBonus] = useState(0);

  const isPreview = mode === 'preview';

  const loadOwnData = useCallback(async () => {
    const [photosData, commentsData, statsData] = await Promise.all([
      pioneirosApi.get<PioneiroPhoto[]>('/pioneiros/photos'),
      pioneirosApi.get<PioneiroComment[]>('/pioneiros/comments'),
      pioneirosApi.get<Stats>('/pioneiros/stats'),
    ]);
    setPhotos(photosData);
    setComments(commentsData);
    setStats(statsData);
  }, []);

  useEffect(() => {
    api.get<SiteSettings>('/settings').then(setSettings);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const pioneiroToken = getPioneiroToken();

      if (pioneiroToken) {
        try {
          const data = await pioneirosApi.get<{ pioneiro: Pioneiro }>('/pioneiros/me');
          if (cancelled) return;
          setPioneiro(data.pioneiro);
          setMode('own');
          await loadOwnData();
          const visit = await pioneirosApi.post<{ pioneiro: Pioneiro; pointsEarned: number }>('/pioneiros/visit');
          if (cancelled) return;
          setPioneiro(visit.pioneiro);
          setVisitBonus(visit.pointsEarned);
          return;
        } catch {
          setPioneiroToken(null);
        }
      }

      // sem sessão de pioneiro: será que é admin/ajudante só de passagem?
      try {
        const me = await api.get<{ user: { role: string; permissions: Record<string, boolean> } }>('/auth/me');
        if (cancelled) return;
        const canPreview = me.user.role === 'admin' || me.user.permissions['gallery.manage'];
        if (!canPreview) {
          navigate('/pioneiros', { replace: true });
          return;
        }
        const preview = await api.get<{
          pioneiro: Pioneiro | null;
          photos: PioneiroPhoto[];
          comments: PioneiroComment[];
        }>('/pioneiros/preview');
        if (cancelled) return;
        if (!preview.pioneiro) {
          navigate('/pioneiros', { replace: true });
          return;
        }
        setPioneiro(preview.pioneiro);
        setPhotos(preview.photos);
        setComments(preview.comments);
        const statsData = await api.get<Stats>('/pioneiros/stats');
        if (cancelled) return;
        setStats(statsData);
        setMode('preview');
      } catch {
        if (!cancelled) navigate('/pioneiros', { replace: true });
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [navigate, loadOwnData]);

  function handleLogout() {
    setPioneiroToken(null);
    navigate('/pioneiros');
  }

  if (mode === 'loading' || !settings || !pioneiro) {
    return <div className="min-h-screen bg-[#0A0A0C]" />;
  }

  if (!settings.pioneirosCampaignActive) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-lg font-medium text-white">Essa área não está mais disponível.</p>
        <Link to="/" className="text-sm font-semibold text-[#FF5E14] hover:text-[#E04D0B] transition">
          Voltar pro início
        </Link>
      </div>
    );
  }

  const firstName = pioneiro.name.trim().split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 font-sans selection:bg-[#FF5E14] selection:text-white">
      <nav className="sticky top-0 z-30 w-full bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF5E14] to-[#E03A00] flex items-center justify-center shrink-0">
              <Rocket size={15} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm truncate">Programa Pioneiros</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-zinc-400 hover:text-white transition px-2.5 py-1.5 rounded-lg"
            >
              <Home size={15} />
              <span className="hidden sm:inline">Ver site</span>
            </Link>
            {!isPreview && (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-zinc-400 hover:text-red-400 transition px-2.5 py-1.5 rounded-lg"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {isPreview && (
        <div className="bg-[#FF5E14]/10 border-b border-[#FF5E14]/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2 text-xs sm:text-sm text-orange-200">
            <Eye size={15} className="shrink-0" />
            <span>
              Modo visualização — mostrando o perfil de <strong>{pioneiro.name}</strong>, quem mais ajudou até agora.
            </span>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center gap-2 text-xs sm:text-sm text-zinc-400 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8 mx-auto w-fit"
          >
            <Users size={14} className="text-[#FF5E14]" />
            <span>
              <strong className="text-white">{stats.totalCount}</strong> {stats.totalCount === 1 ? 'pessoa já ajudou' : 'pessoas já ajudaram'}
            </span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center flex flex-col items-center mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            {isPreview ? `Perfil de ${firstName}` : `Olá, ${firstName}! 👋`}
          </h1>
          <p className="text-zinc-400 text-sm max-w-sm">
            {isPreview
              ? 'Assim fica a área de quem está ajudando a construir o site.'
              : `Obrigado por topar ajudar a construir o ${settings.siteName} antes do lançamento.`}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="bg-gradient-to-br from-[#1E110A] to-[#120B06] border border-[#FF5E14]/25 rounded-3xl p-8 flex flex-col items-center text-center mb-8"
        >
          <div className="flex items-center gap-2 text-orange-300 text-xs font-bold uppercase tracking-wide mb-3">
            <Trophy size={16} />
            {isPreview ? 'Pontuação' : 'Sua pontuação'}
          </div>
          <p className="text-5xl sm:text-6xl font-black text-white">{pioneiro.points}</p>
          <p className="text-zinc-400 text-sm mt-1">pontos até agora</p>
          {!isPreview && visitBonus > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-green-400 mt-3 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1"
            >
              +{visitBonus} pontos por acessar hoje!
            </motion.p>
          )}
        </motion.div>

        <div className="flex flex-col gap-5">
          <AvatarTask pioneiro={pioneiro} isPreview={isPreview} onUpdated={setPioneiro} />
          <PhotosTask photos={photos} isPreview={isPreview} onUploaded={(newPhotos, earned) => {
            setPhotos((prev) => [...newPhotos, ...prev]);
            setPioneiro((p) => (p ? { ...p, points: p.points + earned } : p));
          }} />
          <CommentsTask comments={comments} isPreview={isPreview} onSubmitted={(comment, earned) => {
            setComments((prev) => [comment, ...prev]);
            setPioneiro((p) => (p ? { ...p, points: p.points + earned } : p));
          }} />
        </div>

        {stats && stats.ranking.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="bg-[#141418] border border-white/10 rounded-2xl p-6 sm:p-7 mt-5"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <Crown size={18} className="text-[#FF5E14]" />
              <h2 className="text-white font-bold text-base">Top 5 quem mais ajudou</h2>
            </div>
            <div className="flex flex-col gap-2.5">
              {stats.ranking.map((entry, i) => {
                const isMe = !isPreview && entry.id === pioneiro.id;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ${
                      isMe ? 'bg-[#FF5E14]/10 border border-[#FF5E14]/30' : 'bg-white/5 border border-transparent'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        i === 0
                          ? 'bg-[#FFD54A] text-black'
                          : i === 1
                            ? 'bg-zinc-300 text-black'
                            : i === 2
                              ? 'bg-[#C97A3D] text-white'
                              : 'bg-white/10 text-zinc-400'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <RankingAvatar name={entry.name} avatarUrl={entry.avatarUrl} />
                    <span className="flex-1 text-sm text-white font-medium truncate">
                      {entry.name} {isMe && <span className="text-[#FF5E14]">(você)</span>}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#FF5E14] font-bold text-sm shrink-0">
                      <Trophy size={12} />
                      {entry.points}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function RankingAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={`${UPLOADS_BASE}${avatarUrl}`}
        alt={name}
        className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
      {name[0]?.toUpperCase()}
    </div>
  );
}

function TaskCard({
  icon: Icon,
  title,
  points,
  description,
  done,
  children,
}: {
  icon: typeof Camera;
  title: string;
  points: string;
  description: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#141418] border border-white/10 rounded-2xl p-6 sm:p-7">
      <div className="flex items-start gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-[#FF5E14]/10 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-[#FF5E14]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-base leading-tight">{title}</h3>
          <p className="text-zinc-400 text-sm mt-1">{description}</p>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 text-green-400 text-xs font-bold shrink-0 bg-green-500/10 rounded-full px-2.5 py-1">
            <CheckCircle2 size={13} /> Feito
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[#FF5E14] font-black text-sm shrink-0">
            <Trophy size={13} />
            {points}
          </span>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function AvatarTask({
  pioneiro,
  isPreview,
  onUpdated,
}: {
  pioneiro: Pioneiro;
  isPreview: boolean;
  onUpdated: (p: Pioneiro) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileSelected(file: File) {
    const reader = new FileReader();
    reader.onload = () => setRawImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleConfirmCrop(blob: Blob) {
    setRawImageSrc(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', blob, 'avatar.jpg');
      const data = await pioneirosApi.post<{ pioneiro: Pioneiro }>('/pioneiros/avatar', form);
      onUpdated(data.pioneiro);
    } finally {
      setUploading(false);
    }
  }

  return (
    <TaskCard
      icon={Camera}
      title="Adicione sua foto de perfil"
      points="+30"
      description="Carregue do computador, da galeria ou tire uma foto na hora. Você recorta pra ficar no tamanho certo."
      done={!!pioneiro.avatarUrl}
    >
      <div className="flex items-center gap-4">
        {pioneiro.avatarUrl ? (
          <img
            src={`${UPLOADS_BASE}${pioneiro.avatarUrl}`}
            alt={pioneiro.name}
            className="w-16 h-16 rounded-2xl object-cover border border-white/10"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-dashed border-white/15 flex items-center justify-center text-zinc-500">
            <Camera size={22} />
          </div>
        )}

        {!isPreview && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-60"
            >
              {uploading ? 'Enviando...' : pioneiro.avatarUrl ? 'Trocar foto' : 'Escolher foto'}
            </button>
          </>
        )}
      </div>

      {rawImageSrc && (
        <ImageCropModal
          imageSrc={rawImageSrc}
          spec={IMAGE_SPECS.avatar}
          onCancel={() => setRawImageSrc(null)}
          onConfirm={handleConfirmCrop}
        />
      )}
    </TaskCard>
  );
}

function PhotosTask({
  photos,
  isPreview,
  onUploaded,
}: {
  photos: PioneiroPhoto[];
  isPreview: boolean;
  onUploaded: (photos: PioneiroPhoto[], pointsEarned: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setError(null);
    if (!title.trim()) return setError('Dê um título pras suas fotos');
    if (files.length === 0) return setError('Escolha ao menos uma foto');

    setUploading(true);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      files.forEach((f) => form.append('images', f));
      const data = await pioneirosApi.post<{ photos: PioneiroPhoto[]; pointsEarned: number }>('/pioneiros/photos', form);
      onUploaded(data.photos, data.pointsEarned);
      setTitle('');
      setFiles([]);
    } catch {
      setError('Não foi possível enviar. Tente de novo.');
    } finally {
      setUploading(false);
    }
  }

  const grouped = groupByTitle(photos);

  return (
    <TaskCard
      icon={ImagePlus}
      title="Envie fotos dos encontros"
      points="+1,5 / foto"
      description="Fotos dos encontros oficiais ou daquelas resenhas informais. Escolha quantas quiser, com um título."
    >
      {!isPreview && (
        <div className="flex flex-col gap-3 mb-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (ex: Churrasco de aniversário do Zé)"
            className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2.5 text-sm outline-none focus:border-[#FF5E14] transition"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              <ImagePlus size={15} />
              {files.length > 0 ? `${files.length} foto(s) escolhida(s)` : 'Escolher fotos'}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={uploading}
              className="inline-flex items-center gap-2 bg-[#FF5E14] hover:bg-[#E04D0B] disabled:opacity-60 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition"
            >
              <Send size={14} />
              {uploading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      {grouped.length > 0 ? (
        <div className="flex flex-col gap-4">
          {grouped.map(([groupTitle, groupPhotos]) => (
            <div key={groupTitle}>
              <p className="text-xs text-zinc-400 font-medium mb-2">{groupTitle}</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {groupPhotos.map((p) => (
                  <img
                    key={p.id}
                    src={`${UPLOADS_BASE}${p.imageUrl}`}
                    alt={groupTitle}
                    className="aspect-square rounded-lg object-cover border border-white/10"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          {isPreview ? 'Nenhuma foto enviada ainda.' : 'Suas fotos enviadas aparecem aqui.'}
        </p>
      )}
    </TaskCard>
  );
}

function groupByTitle(photos: PioneiroPhoto[]): [string, PioneiroPhoto[]][] {
  const map = new Map<string, PioneiroPhoto[]>();
  for (const photo of photos) {
    const list = map.get(photo.title) ?? [];
    list.push(photo);
    map.set(photo.title, list);
  }
  return Array.from(map.entries());
}

function CommentsTask({
  comments,
  isPreview,
  onSubmitted,
}: {
  comments: PioneiroComment[];
  isPreview: boolean;
  onSubmitted: (comment: PioneiroComment, pointsEarned: number) => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) return setError('Escreva algo primeiro');

    setSending(true);
    try {
      const data = await pioneirosApi.post<{ comment: PioneiroComment; pointsEarned: number }>('/pioneiros/comments', {
        text: text.trim(),
      });
      onSubmitted(data.comment, data.pointsEarned);
      setText('');
    } catch {
      setError('Não foi possível enviar. Tente de novo.');
    } finally {
      setSending(false);
    }
  }

  return (
    <TaskCard
      icon={MessageSquare}
      title="Deixe um comentário ou relato"
      points="+3 / comentário"
      description="Conte algo sobre o site, um encontro, ou qualquer resenha que mereça ficar registrada."
    >
      {!isPreview && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Escreva aqui..."
            className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2.5 text-sm outline-none focus:border-[#FF5E14] transition resize-none"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="self-end inline-flex items-center gap-2 bg-[#FF5E14] hover:bg-[#E04D0B] disabled:opacity-60 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition"
          >
            <Send size={14} />
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      )}

      {comments.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {comments.map((c) => (
            <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200">
              {c.text}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          {isPreview ? 'Nenhum comentário ainda.' : 'Seus comentários aparecem aqui — só você (e o admin) vê.'}
        </p>
      )}
    </TaskCard>
  );
}
