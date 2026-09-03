import { QRCodeSVG } from 'qrcode.react';
import { Download, Smartphone } from 'lucide-react';
import { UPLOADS_BASE } from '../lib/config';
import { PrivateLayout } from '../components/PrivateLayout';

const APK_URL = `${UPLOADS_BASE}/uploads/fura-bucho.apk`;

export function DownloadAppPage() {
  return (
    <PrivateLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display uppercase tracking-wider text-2xl text-text-main">Baixar o app</h1>
            <p className="text-sm text-text-muted">O Fura-Bucho no seu bolso, com o feed no formato de rede social.</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mt-8 flex flex-col sm:flex-row items-center gap-8">
          <div className="bg-white p-4 rounded-2xl shrink-0">
            <QRCodeSVG value={APK_URL} size={168} />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm text-text-main font-medium mb-1">Escaneie com a câmera do celular</p>
            <p className="text-sm text-text-muted mb-5">
              Aponte a câmera do seu Android pra esse QR code — ele vai abrir o link de download direto no navegador do
              celular.
            </p>

            <a
              href={APK_URL}
              download
              className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-5 py-2.5 transition"
            >
              <Download size={16} /> Baixar para Android
            </a>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-semibold text-text-main uppercase tracking-wide">Como instalar</h2>
          <ol className="space-y-3 text-sm text-text-muted list-decimal list-inside">
            <li>Toque no botão acima (ou escaneie o QR) pra baixar o arquivo <code className="text-text-main">fura-bucho.apk</code>.</li>
            <li>
              Abra o arquivo baixado. Se o Android avisar que a instalação de fontes desconhecidas está bloqueada,
              toque em <strong>Configurações</strong> e permita instalar desse app (geralmente o navegador ou o
              gerenciador de arquivos).
            </li>
            <li>Toque em <strong>Instalar</strong> e pronto — o ícone do Fura-Bucho aparece na sua tela.</li>
          </ol>
          <p className="text-xs text-text-faint pt-2">
            Disponível para Android por enquanto. A versão para iPhone está em preparação.
          </p>
        </div>
      </div>
    </PrivateLayout>
  );
}
