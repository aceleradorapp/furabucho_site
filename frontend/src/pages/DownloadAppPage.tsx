import { QRCodeSVG } from 'qrcode.react';
import { Bell, Check, Download, Share, Smartphone, SquarePlus, Zap } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client';
import { InstallAppButton } from '../components/InstallAppButton';
import { PrivateLayout } from '../components/PrivateLayout';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { usePush } from '../hooks/usePush';

/** Liga/desliga os avisos com o app fechado, e explica o porquê quando não dá pra ligar. */
function AvisosNoCelular() {
  const { estado, ocupado, ligar, desligar } = usePush();
  const [testando, setTestando] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);

  if (estado === 'carregando' || estado === 'indisponivel') return null;

  async function testar() {
    setTestando(true);
    setRecado(null);
    try {
      const r = await api.post<{ enviados: number }>('/push/testar');
      setRecado(
        r.enviados > 0
          ? 'Enviado! O aviso deve aparecer em instantes.'
          : 'Nenhum aparelho recebeu — tente desligar e ligar de novo.',
      );
    } catch {
      setRecado('Não foi possível enviar o teste agora.');
    } finally {
      setTestando(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mt-4">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Bell size={17} className="text-primary" />
        </div>
        <p className="text-sm font-semibold text-text-main">Avisos no celular</p>
      </div>

      {estado === 'precisa-instalar' && (
        <p className="text-sm text-text-muted">
          No iPhone, os avisos só funcionam com o Fura-Bucho <strong className="text-text-main">instalado na tela
          inicial</strong>. Faça a instalação acima e volte aqui — o botão vai aparecer.
        </p>
      )}

      {estado === 'bloqueado' && (
        <p className="text-sm text-text-muted">
          Você bloqueou os avisos para este site. Pra voltar atrás, é preciso liberar nas
          configurações do navegador — ele não pergunta de novo sozinho.
        </p>
      )}

      {estado === 'desligado' && (
        <>
          <p className="text-sm text-text-muted mb-4">
            Receba um aviso quando curtirem sua foto, comentarem ou te mandarem um bilhetinho —
            mesmo com o app fechado.
          </p>
          <button
            onClick={ligar}
            disabled={ocupado}
            className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-5 py-3 transition disabled:opacity-60"
          >
            <Bell size={16} /> {ocupado ? 'Ativando...' : 'Ativar avisos'}
          </button>
        </>
      )}

      {estado === 'ligado' && (
        <>
          <p className="text-sm text-green-700 dark:text-green-400 inline-flex items-center gap-1.5 mb-4">
            <Check size={15} /> Avisos ativados neste aparelho.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={testar}
              disabled={testando}
              className="rounded-full border border-border hover:border-primary hover:text-primary text-text-muted text-sm font-medium px-4 py-2 transition disabled:opacity-60"
            >
              {testando ? 'Enviando...' : 'Enviar um teste'}
            </button>
            <button
              onClick={desligar}
              disabled={ocupado}
              className="rounded-full text-text-muted hover:text-red-600 text-sm px-3 py-2 transition disabled:opacity-60"
            >
              Desativar
            </button>
          </div>
          {recado && <p className="text-xs text-text-muted mt-3">{recado}</p>}
        </>
      )}
    </div>
  );
}

function Passo({ numero, children }: { numero: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-7 h-7 shrink-0 rounded-full bg-card-subtle text-text-main text-xs font-bold flex items-center justify-center">
        {numero}
      </span>
      <p className="text-sm text-text-main pt-1">{children}</p>
    </li>
  );
}

export function DownloadAppPage() {
  const { canInstall, isInstalled, isIOS, isMobile } = useInstallPrompt();
  const enderecoDoSite = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <PrivateLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display uppercase tracking-wider text-2xl text-text-main">Fura-Bucho no celular</h1>
            <p className="text-sm text-text-muted">Um ícone na sua tela inicial, abrindo direto no feed.</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm text-text-muted mb-4">
            Não é um programa pra baixar nem um arquivo pra instalar — é o próprio site virando um ícone na sua tela,
            que abre em tela cheia, sem a barra do navegador. Funciona no Android e no iPhone.
          </p>

          <div className="flex flex-col gap-2.5 mb-5">
            {[
              { icone: Zap, texto: 'Abre num toque, sem digitar endereço' },
              { icone: Bell, texto: 'É o único jeito de receber avisos quando tiver foto nova' },
            ].map(({ icone: Icone, texto }) => (
              <div key={texto} className="flex items-start gap-2.5">
                <Icone size={15} className="text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-text-muted">{texto}</p>
              </div>
            ))}
          </div>

          {isInstalled ? (
            <div className="bg-green-500/10 border border-green-600/30 rounded-xl p-4 text-center">
              <p className="text-sm text-green-700 dark:text-green-400 inline-flex items-center gap-1.5">
                <Check size={15} /> Pronto, já está instalado neste aparelho.
              </p>
            </div>
          ) : canInstall ? (
            <InstallAppButton className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-5 py-3 transition">
              <Download size={16} /> Instalar agora
            </InstallAppButton>
          ) : isIOS ? (
            // No iPhone o Safari não oferece botão nenhum: só dá pra fazer pelo menu Compartilhar.
            <ol className="flex flex-col gap-3">
              <Passo numero={1}>
                Toque em <Share size={14} className="inline align-text-bottom mx-0.5 text-primary" />{' '}
                <strong>Compartilhar</strong>, na barra de baixo do Safari.
              </Passo>
              <Passo numero={2}>
                Role a lista e toque em{' '}
                <SquarePlus size={14} className="inline align-text-bottom mx-0.5 text-primary" />{' '}
                <strong>Adicionar à Tela de Início</strong>.
              </Passo>
              <Passo numero={3}>
                Confirme em <strong>Adicionar</strong>. O ícone aparece na sua tela.
              </Passo>
            </ol>
          ) : isMobile ? (
            <ol className="flex flex-col gap-3">
              <Passo numero={1}>
                Toque no menu <strong>⋮</strong> do navegador, no canto de cima.
              </Passo>
              <Passo numero={2}>
                Escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
              </Passo>
            </ol>
          ) : (
            <p className="text-sm text-text-muted">
              Você está no computador — aqui o atalho não faz sentido. Use o QR code abaixo pra abrir no celular.
            </p>
          )}
        </div>

        <AvisosNoCelular />

        {/* O QR existe pro dia do encontro: a pessoa aponta a câmera e já cai no site pra instalar. */}
        {!isMobile && enderecoDoSite && (
          <div className="bg-card border border-border rounded-2xl p-5 mt-4">
            <p className="text-sm font-semibold text-text-main mb-1">Abrir no celular</p>
            <p className="text-sm text-text-muted mb-4">
              Aponte a câmera do celular para o código. Serve também pra imprimir e deixar nas mesas do encontro.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="bg-white p-3 rounded-2xl shrink-0">
                <QRCodeSVG value={enderecoDoSite} size={140} />
              </div>
              <p className="text-xs text-text-muted break-all">{enderecoDoSite}</p>
            </div>
          </div>
        )}
      </div>
    </PrivateLayout>
  );
}
