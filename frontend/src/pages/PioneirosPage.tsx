import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Gift,
  Images,
  Megaphone,
  MessageCircle,
  PartyPopper,
  Rocket,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { getPioneiroToken, pioneirosApi, setPioneiroToken } from '../api/pioneirosClient';

interface SiteSettings {
  siteName: string;
  pioneirosCampaignActive: boolean;
}

const PREVIEW_ITEMS = [
  { icon: Images, text: 'Fotos dos nossos encontros' },
  { icon: Megaphone, text: 'Avisos de eventos' },
  { icon: MessageCircle, text: 'Postagens de todo mundo, tipo um feed' },
  { icon: PartyPopper, text: 'Brincadeiras e sorteios' },
];

export function PioneirosPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [formMode, setFormMode] = useState<'signup' | 'login'>('signup');
  const [step, setStep] = useState<'content' | 'success'>('content');
  const [pointsEarned, setPointsEarned] = useState(0);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<SiteSettings>('/settings').then(setSettings);
  }, []);

  useEffect(() => {
    const token = getPioneiroToken();
    if (!token) {
      setCheckingSession(false);
      return;
    }
    pioneirosApi
      .get('/pioneiros/me')
      .then(() => navigate('/pioneiros/painel', { replace: true }))
      .catch(() => {
        setPioneiroToken(null);
        setCheckingSession(false);
      });
  }, [navigate]);

  function buildContactPayload() {
    const trimmed = contact.trim();
    return trimmed.includes('@') ? { email: trimmed } : { phone: trimmed };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() && formMode === 'signup') {
      setError('Informe seu nome completo');
      return;
    }
    if (!contact.trim()) {
      setError('Informe seu e-mail ou telefone');
      return;
    }
    if (!password || password.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres');
      return;
    }
    if (formMode === 'signup' && password !== confirmPassword) {
      setError('As senhas não são iguais. Confira e tente de novo.');
      return;
    }

    setLoading(true);
    try {
      if (formMode === 'signup') {
        const data = await pioneirosApi.post<{ token: string; pointsEarned: number }>('/pioneiros/signup', {
          name: name.trim(),
          password,
          ...buildContactPayload(),
        });
        setPioneiroToken(data.token);
        setPointsEarned(data.pointsEarned);
        setStep('success');
      } else {
        const data = await pioneirosApi.post<{ token: string }>('/pioneiros/login', {
          identifier: contact.trim(),
          password,
        });
        setPioneiroToken(data.token);
        navigate('/pioneiros/painel');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession || !settings) {
    return <div className="min-h-screen bg-[#0A0A0C]" />;
  }

  if (!settings.pioneirosCampaignActive) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-lg font-medium text-white">Essa página não está mais disponível.</p>
        <p className="text-sm text-zinc-400 max-w-sm">
          O programa de pré-lançamento já foi encerrado. Fique de olho nas novidades do site.
        </p>
        <Link
          to="/"
          className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#FF5E14] hover:text-[#E04D0B] transition"
        >
          <ArrowLeft size={16} /> Voltar pro início
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 font-sans selection:bg-[#FF5E14] selection:text-white">
      <nav className="w-full border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition">
            <ArrowLeft size={16} /> Voltar pro início
          </Link>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {step === 'content' ? (
          <motion.div key="content" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {/* Hero + cadastro (visível logo de cara, sem precisar rolar) */}
            <section className="relative w-full py-14 sm:py-20 px-4 sm:px-6 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FF5E14]/15 rounded-full blur-[140px] pointer-events-none" />
              <div className="relative max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-8 items-center">
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#FF5E14] to-[#E03A00] flex items-center justify-center shadow-lg shadow-orange-600/30 mb-5"
                  >
                    <Rocket size={26} className="text-white" />
                  </motion.div>

                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-[#FF5E14] font-black tracking-widest text-xs uppercase mb-3"
                  >
                    Antes do grande lançamento
                  </motion.span>

                  <motion.h1
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight"
                  >
                    Programa Pioneiros
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.22 }}
                    className="text-zinc-300 text-base sm:text-lg mt-5 max-w-md leading-relaxed"
                  >
                    O site oficial do {settings.siteName} está quase pronto! Ajude a construir ele com a gente e
                    ganhe pontos por isso — é rápido, é já aqui embaixo.
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="w-full max-w-md mx-auto"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#FF5E14]/10 flex items-center justify-center shrink-0">
                      <UserPlus size={18} className="text-[#FF5E14]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#FF5E14] font-bold uppercase tracking-wide">Primeira tarefa</p>
                      <h2 className="text-white font-bold text-lg leading-tight">Faça seu cadastro</h2>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1 text-[#FF5E14] font-black text-sm shrink-0">
                      <Trophy size={14} />
                      +10
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm mb-4">
                    Coloque seus dados corretamente pra garantir seu acesso e sua pontuação.
                  </p>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 bg-[#141418] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl">
                    {formMode === 'signup' && (
                      <Field label="Nome completo">
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Seu nome"
                          className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2.5 text-sm outline-none focus:border-[#FF5E14] transition"
                        />
                      </Field>
                    )}

                    <Field label="E-mail ou telefone">
                      <input
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="voce@email.com ou (11) 99999-9999"
                        className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2.5 text-sm outline-none focus:border-[#FF5E14] transition"
                      />
                    </Field>

                    <Field label={formMode === 'signup' ? 'Crie uma senha' : 'Senha'}>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="mínimo 6 caracteres"
                          className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2.5 pr-16 text-sm outline-none focus:border-[#FF5E14] transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white transition"
                        >
                          {showPassword ? 'ocultar' : 'mostrar'}
                        </button>
                      </div>
                    </Field>

                    {formMode === 'signup' && (
                      <Field label="Confirme a senha">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="digite a senha de novo"
                          className={`w-full rounded-lg bg-white/5 border text-white px-3 py-2.5 text-sm outline-none transition ${
                            confirmPassword && confirmPassword !== password
                              ? 'border-red-500/60 focus:border-red-500'
                              : 'border-white/10 focus:border-[#FF5E14]'
                          }`}
                        />
                        {confirmPassword && confirmPassword !== password && (
                          <span className="text-xs text-red-400 mt-1">As senhas ainda não são iguais.</span>
                        )}
                      </Field>
                    )}

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-1 inline-flex items-center justify-center gap-2 bg-[#FF5E14] hover:bg-[#E04D0B] disabled:opacity-60 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-orange-600/30 transition text-sm"
                    >
                      {loading ? 'Um instante...' : formMode === 'signup' ? 'Quero ajudar' : 'Entrar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormMode((m) => (m === 'signup' ? 'login' : 'signup'));
                        setError(null);
                        setConfirmPassword('');
                      }}
                      className="text-xs text-zinc-400 hover:text-white transition"
                    >
                      {formMode === 'signup' ? 'Já se cadastrou? Entrar' : 'Ainda não se cadastrou? Fazer cadastro'}
                    </button>
                  </form>
                </motion.div>
              </div>
            </section>

            {/* Contexto completo, pra quem quer saber mais antes de se cadastrar */}
            <section className="w-full py-16 px-4 sm:px-6 bg-[#0F0F12] border-t border-white/5">
              <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.6 }}
                  className="text-zinc-300 text-base sm:text-lg leading-relaxed"
                >
                  Quando estrear, o site vai ter de tudo pra manter a gente unido:
                </motion.p>

                <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-lg">
                  {PREVIEW_ITEMS.map((item, i) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                      className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-left"
                    >
                      <item.icon size={16} className="text-[#FF5E14] shrink-0" />
                      <span className="text-xs sm:text-sm text-zinc-200 leading-snug">{item.text}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  className="text-zinc-300 text-base sm:text-lg mt-8 max-w-xl leading-relaxed"
                >
                  Agora é sua vez de ajudar a gente a construir isso. Vamos criar algumas tarefas simples — como
                  enviar fotos (dos encontros oficiais ou daquelas resenhas informais que também merecem um
                  registro) e escrever alguns relatos. No final, todo mundo sai ganhando.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                  className="flex items-center gap-2.5 bg-[#FF5E14]/10 border border-[#FF5E14]/25 rounded-xl px-4 py-3 mt-6 text-sm text-orange-200 text-left"
                >
                  <Trophy size={18} className="text-[#FF5E14] shrink-0" />
                  <span>
                    Cada tarefa concluída vale pontos, e esses pontos viram benefícios de verdade. Quem mais
                    contribuir ganha uma surpresa especial no dia do evento.
                  </span>
                </motion.div>
              </div>
            </section>

            <section className="w-full py-10 px-4 sm:px-6 text-center">
              <p className="text-zinc-500 text-xs max-w-md mx-auto">
                Mais tarefas (fotos, relatos e outras) chegam em breve na sua área — fique de olho.
              </p>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6"
          >
            <div className="max-w-sm w-full text-center flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'backOut' }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF5E14] to-[#E03A00] flex items-center justify-center shadow-xl shadow-orange-600/40 mb-6"
              >
                <Gift size={32} className="text-white" />
              </motion.div>
              <h2 className="text-2xl font-extrabold text-white mb-2">Cadastro recebido!</h2>
              <p className="text-zinc-300 text-sm leading-relaxed mb-1">
                Você já ganhou <span className="text-[#FF5E14] font-bold">+{pointsEarned} pontos</span> por dar o
                primeiro passo.
              </p>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                Em breve mais tarefas aparecem na sua área — continue por lá que a gente te avisa.
              </p>
              <button
                onClick={() => navigate('/pioneiros/painel')}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#FF5E14] hover:bg-[#E04D0B] text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-orange-600/30 transition text-sm"
              >
                Continuar <Camera size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-zinc-400 font-medium">{label}</span>
      {children}
    </label>
  );
}
