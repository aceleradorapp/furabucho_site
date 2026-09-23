import { QRCodeSVG } from 'qrcode.react';
import { Download, LinkIcon, Rocket, Smartphone, Store } from 'lucide-react';
import { UPLOADS_BASE } from '../lib/config';
import { InstallAppButton } from '../components/InstallAppButton';
import { PrivateLayout } from '../components/PrivateLayout';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const APK_URL = `${UPLOADS_BASE}/uploads/fura-bucho.apk`;

export function DownloadAppPage() {
  const { canInstall, showManualInstructions, isInstalled, isMobile } = useInstallPrompt();

  return (
    <PrivateLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display uppercase tracking-wider text-2xl text-text-main">Acesso rápido no celular</h1>
            <p className="text-sm text-text-muted">O Fura-Bucho sempre à mão, com o feed no formato de rede social.</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mt-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <LinkIcon size={17} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-text-main">Atalho na tela inicial</p>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Isso <strong className="text-text-main">não baixa nenhum arquivo nem programa</strong> — é só um ícone
            do site fixado na tela do seu celular, que abre o Fura-Bucho em tela cheia, como se fosse um app. Rápido
            de configurar e funciona tanto no Android quanto no iPhone.
          </p>

          {isMobile ? (
            isInstalled ? (
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">✓ Já está instalado nesse celular.</p>
            ) : canInstall || showManualInstructions ? (
              <InstallAppButton className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-5 py-2.5 transition">
                <Download size={16} /> Criar atalho na tela inicial
              </InstallAppButton>
            ) : (
              <p className="text-xs text-text-faint">Seu navegador atual não suporta esse atalho automático.</p>
            )
          ) : (
            <p className="text-xs text-text-faint">
              Abra <strong className="text-text-main">friendsface.com.br</strong> pelo navegador do seu celular pra
              ver a opção de criar esse atalho — no computador ela não aparece.
            </p>
          )}
        </div>

        {!isMobile && (
          <div className="bg-card border border-border rounded-2xl p-5 mt-4">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Rocket size={17} className="text-primary" />
              </div>
              <p className="text-sm font-semibold text-text-main">App Android (versão de testes)</p>
            </div>
            <p className="text-sm text-text-muted mb-5">
              Esse aqui é um aplicativo Android de verdade, ainda em fase de testes — não está na Google Play, então
              o próprio Android vai pedir sua permissão pra instalar de fora da loja.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white p-3 rounded-2xl shrink-0">
                <QRCodeSVG value={APK_URL} size={140} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs text-text-muted mb-3">Escaneie o QR code com a câmera de um celular Android.</p>
                <a
                  href={APK_URL}
                  download
                  className="inline-flex items-center gap-2 rounded-full border border-border hover:border-primary hover:text-primary text-text-muted text-sm font-medium px-4 py-2 transition"
                >
                  <Download size={15} /> Baixar .apk para Android
                </a>
              </div>
            </div>

            <ol className="mt-5 space-y-2 text-xs text-text-muted list-decimal list-inside">
              <li>Baixe o arquivo <code className="text-text-main">fura-bucho.apk</code>.</li>
              <li>Abra o arquivo baixado e permita a instalação quando o Android avisar sobre "fontes desconhecidas".</li>
              <li>Toque em <strong>Instalar</strong> e pronto.</li>
            </ol>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2.5 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3.5">
          <Store size={17} className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted">
            <strong className="text-text-main">Em breve:</strong> apps oficiais do Fura-Bucho na Google Play e na App
            Store (iPhone).
          </p>
        </div>
      </div>
    </PrivateLayout>
  );
}
