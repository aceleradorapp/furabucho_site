import { AnimatePresence, motion } from 'framer-motion';
import { Rocket, Trophy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DISMISSED_KEY = 'fb_pioneiros_dismissed';
const PIONEIRO_TOKEN_KEY = 'fb_pioneiro_token';
const SHOW_DELAY_MS = 900;

export function PioneirosPrompt({ active }: { active: boolean }) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [showFloating, setShowFloating] = useState(false);

  useEffect(() => {
    if (!active) return;

    // Quem já se cadastrou como Pioneiro não precisa ser convidado de novo.
    let alreadyPioneiro = false;
    try {
      alreadyPioneiro = !!localStorage.getItem(PIONEIRO_TOKEN_KEY);
    } catch {
      alreadyPioneiro = false;
    }
    if (alreadyPioneiro) return;

    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      dismissed = false;
    }

    if (dismissed) {
      setShowFloating(true);
      return;
    }

    const timer = setTimeout(() => setModalOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active]);

  function persistDismissed() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // localStorage/sessionStorage indisponível (modo privado, etc.) — sem problema, só não vai lembrar
    }
  }

  function handleAccess() {
    setModalOpen(false);
    navigate('/pioneiros');
  }

  function handleCancel() {
    setModalOpen(false);
    setShowFloating(true);
    persistDismissed();
  }

  function handleFloatingClick() {
    navigate('/pioneiros');
  }

  if (!active) return null;

  return (
    <>
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[#141418] border border-white/10 rounded-3xl p-7 sm:p-8 shadow-2xl"
            >
              <button
                onClick={handleCancel}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF5E14] to-[#E03A00] flex items-center justify-center shadow-lg shadow-orange-600/30 mb-5">
                <Rocket size={24} className="text-white" />
              </div>

              <span className="text-[#FF5E14] font-black tracking-widest text-[11px] uppercase mb-1 block">
                Antes do lançamento oficial
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-3">
                Bem-vindo! Quer ajudar a construir o site?
              </h2>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                Estamos preparando o lançamento oficial e você pode ajudar desde já — completando seu cadastro e
                algumas outras tarefas simples. Cada tarefa concluída vale pontos, e esses pontos viram benefícios
                pra quem participar dessa fase inicial com a gente.
              </p>

              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-6">
                <Trophy size={14} className="text-[#FF5E14]" />
                <span>Poucos minutos, pontos garantidos.</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAccess}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#FF5E14] hover:bg-[#E04D0B] text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-orange-600/30 transition text-sm"
                >
                  Acessar
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold px-5 py-3 rounded-xl border border-white/10 transition text-sm"
                >
                  Agora não
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFloating && !modalOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={handleFloatingClick}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-br from-[#FF5E14] to-[#E03A00] text-white font-semibold text-sm pl-3.5 pr-4 py-3 rounded-full shadow-xl shadow-orange-600/40 hover:shadow-orange-600/60 transition-shadow"
            aria-label="Abrir Programa Pioneiros"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <Rocket size={16} />
            <span className="hidden sm:inline">Programa Pioneiros</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
