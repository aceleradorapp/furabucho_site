import { ArrowRight, Cake, Check, Heart, Images, Share, Smartphone, SquarePlus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { ImageUploadButton } from '../components/ImageUploadButton';
import { PageLoader } from '../components/PageLoader';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { IMAGE_SPECS } from '../lib/imageSpecs';

const TOTAL_PASSOS = 3;

function Passo({ atual }: { atual: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {Array.from({ length: TOTAL_PASSOS }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${i === atual ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`}
        />
      ))}
    </div>
  );
}

function Cartao({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-card-lg shadow-2xl p-7 sm:p-8">{children}</div>
    </div>
  );
}

export function WelcomePage() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { canInstall, isInstalled, isIOS, isMobile, promptInstall } = useInstallPrompt();
  const [passo, setPasso] = useState(0);
  const [birthDate, setBirthDate] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  if (loading) {
    return (
      <div className="min-h-svh bg-card-subtle flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }
  if (!user) return <Navigate to="/?login=1" replace />;
  if (user.mustChangePassword) return <Navigate to="/trocar-senha" replace />;
  if (user.welcomeSeen) return <Navigate to="/feed" replace />;

  const primeiroNome = user.name.split(' ')[0];

  async function enviarFoto(blob: Blob) {
    const form = new FormData();
    form.append('image', blob, 'avatar.jpg');
    await api.post('/profile/avatar', form);
    await refreshUser();
  }

  async function salvarAniversario() {
    if (!birthDate) return;
    setSalvando(true);
    try {
      await api.patch('/profile', { name: user!.name, birthDate });
      await refreshUser();
    } finally {
      setSalvando(false);
    }
  }

  async function concluir() {
    setFinalizando(true);
    try {
      await api.post('/auth/welcome-seen');
      await refreshUser();
      navigate('/feed', { replace: true });
    } catch {
      // Se falhar em marcar, não prende a pessoa na porta de entrada — ela entra do mesmo jeito
      // e vê as boas-vindas de novo no próximo acesso, o que é bem melhor que ficar travada.
      navigate('/feed', { replace: true });
    }
  }

  // ---------- Passo 1: o que é este lugar ----------
  if (passo === 0) {
    return (
      <Cartao>
        <Passo atual={0} />
        <img src="/ico-ff.jpeg" alt="" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4" />
        <h1 className="font-display uppercase tracking-wider text-2xl text-center text-text-main mb-3">
          Bem-vindo, {primeiroNome}!
        </h1>
        <p className="text-text-main text-center mb-6 leading-relaxed">
          Este é o cantinho da turma — o lugar onde as fotos de todos esses anos ficam guardadas e
          onde a conversa continua entre um encontro e outro.
        </p>

        <div className="flex flex-col gap-3 mb-7">
          {[
            { icone: Images, texto: 'O acervo de fotos da turma, organizado por ano' },
            { icone: Heart, texto: 'Um feed pra postar, curtir e comentar' },
            { icone: Cake, texto: 'Os aniversários do mês, pra ninguém passar batido' },
          ].map(({ icone: Icone, texto }) => (
            <div key={texto} className="flex items-start gap-3">
              <span className="w-8 h-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Icone size={16} />
              </span>
              <p className="text-sm text-text-muted pt-1.5">{texto}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setPasso(1)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white font-medium py-3 transition"
        >
          Vamos lá <ArrowRight size={17} />
        </button>
      </Cartao>
    );
  }

  // ---------- Passo 2: colocar a cara ----------
  if (passo === 1) {
    return (
      <Cartao>
        <Passo atual={1} />
        <h1 className="font-display uppercase tracking-wider text-xl text-center text-text-main mb-2">
          Coloque sua cara
        </h1>
        <p className="text-sm text-text-muted text-center mb-6">
          É assim que a turma vai te reconhecer no feed e nos comentários.
        </p>

        <div className="flex flex-col items-center gap-3 mb-6">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={96} />
          <ImageUploadButton
            spec={IMAGE_SPECS.avatar}
            buttonLabel={user.avatarUrl ? 'Trocar foto' : 'Escolher foto'}
            onUpload={enviarFoto}
          />
          {user.avatarUrl && (
            <p className="text-xs text-green-700 dark:text-green-400 inline-flex items-center gap-1">
              <Check size={13} /> Foto salva
            </p>
          )}
        </div>

        <div className="mb-7">
          <label className="text-sm text-text-muted" htmlFor="birthDate">
            Quando é seu aniversário?
          </label>
          <div className="flex gap-2 mt-1">
            <input
              id="birthDate"
              type="date"
              value={birthDate || (user.birthDate ? user.birthDate.slice(0, 10) : '')}
              onChange={(e) => setBirthDate(e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-border px-3 py-2.5 outline-none focus:border-primary"
            />
            <button
              onClick={salvarAniversario}
              disabled={!birthDate || salvando}
              className="shrink-0 rounded-lg border border-border px-4 text-sm text-text-main hover:border-primary transition disabled:opacity-50"
            >
              {salvando ? '...' : 'Salvar'}
            </button>
          </div>
          <p className="text-xs text-text-muted mt-1">Só o dia e o mês aparecem pra turma.</p>
        </div>

        <button
          onClick={() => setPasso(2)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white font-medium py-3 transition"
        >
          Continuar <ArrowRight size={17} />
        </button>
        <button
          onClick={() => setPasso(2)}
          className="w-full text-sm text-text-muted hover:text-text-main transition mt-3"
        >
          Deixar pra depois
        </button>
      </Cartao>
    );
  }

  // ---------- Passo 3: deixar na tela inicial ----------
  return (
    <Cartao>
      <Passo atual={2} />
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
        <Smartphone size={22} />
      </div>
      <h1 className="font-display uppercase tracking-wider text-xl text-center text-text-main mb-2">
        Deixe na tela do celular
      </h1>
      <p className="text-sm text-text-muted text-center mb-6">
        Assim o Fura-Bucho vira um ícone como qualquer outro app — e é o único jeito de você
        receber os avisos quando tiver foto nova.
      </p>

      {isInstalled ? (
        <div className="bg-green-500/10 border border-green-600/30 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-green-700 dark:text-green-400 inline-flex items-center gap-1.5">
            <Check size={15} /> Pronto, já está instalado neste aparelho.
          </p>
        </div>
      ) : canInstall ? (
        <button
          onClick={promptInstall}
          className="w-full rounded-full bg-primary hover:bg-primary-hover text-white font-medium py-3 transition mb-6"
        >
          Instalar agora
        </button>
      ) : isIOS ? (
        // No iPhone o Safari não oferece botão nenhum — tem que ser na mão, e sem mostrar
        // exatamente onde tocar a pessoa não acha.
        <ol className="flex flex-col gap-3 mb-6">
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 shrink-0 rounded-full bg-card-subtle text-text-main text-xs font-bold flex items-center justify-center">
              1
            </span>
            <p className="text-sm text-text-main pt-1">
              Toque em <Share size={14} className="inline align-text-bottom mx-0.5 text-primary" />{' '}
              <strong>Compartilhar</strong>, na barra de baixo do Safari.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 shrink-0 rounded-full bg-card-subtle text-text-main text-xs font-bold flex items-center justify-center">
              2
            </span>
            <p className="text-sm text-text-main pt-1">
              Role a lista e toque em{' '}
              <SquarePlus size={14} className="inline align-text-bottom mx-0.5 text-primary" />{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 shrink-0 rounded-full bg-card-subtle text-text-main text-xs font-bold flex items-center justify-center">
              3
            </span>
            <p className="text-sm text-text-main pt-1">
              Confirme em <strong>Adicionar</strong>. Pronto, o ícone aparece na sua tela.
            </p>
          </li>
        </ol>
      ) : isMobile ? (
        <ol className="flex flex-col gap-3 mb-6">
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 shrink-0 rounded-full bg-card-subtle text-text-main text-xs font-bold flex items-center justify-center">
              1
            </span>
            <p className="text-sm text-text-main pt-1">
              Toque no menu <strong>⋮</strong> do navegador, no canto de cima.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 shrink-0 rounded-full bg-card-subtle text-text-main text-xs font-bold flex items-center justify-center">
              2
            </span>
            <p className="text-sm text-text-main pt-1">
              Escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
            </p>
          </li>
        </ol>
      ) : (
        <div className="bg-card-subtle rounded-xl p-4 mb-6">
          <p className="text-sm text-text-muted">
            Você está no computador. Abra <strong>friendsface.com.br</strong> no celular pra deixar
            o atalho na tela inicial — é lá que o app faz mais diferença.
          </p>
        </div>
      )}

      <button
        onClick={concluir}
        disabled={finalizando}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white font-medium py-3 transition disabled:opacity-60"
      >
        {finalizando ? 'Entrando...' : 'Entrar no app'} <ArrowRight size={17} />
      </button>
      <button onClick={() => setPasso(1)} className="w-full text-sm text-text-muted hover:text-text-main transition mt-3">
        Voltar
      </button>
    </Cartao>
  );
}
