import * as Dialog from '@radix-ui/react-dialog';
import { Download, MoreVertical, Share, SquarePlus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function InstallAppButton({
  className,
  children,
  dialogTheme = 'light',
}: {
  className?: string;
  children?: ReactNode;
  dialogTheme?: 'light' | 'dark';
}) {
  const { canInstall, showManualInstructions, isIOS, promptInstall } = useInstallPrompt();
  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  if (!canInstall && !showManualInstructions) return null;

  if (showManualInstructions) {
    const isDark = dialogTheme === 'dark';
    return (
      <Dialog.Root open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className={className}>
            {children ?? (
              <>
                <Download size={16} /> Instalar app
              </>
            )}
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />
          <Dialog.Content
            className={`fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl focus:outline-none border ${
              isDark ? 'bg-[#141418] border-white/10' : 'bg-card border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title
                className={`font-display uppercase tracking-wider text-base ${isDark ? 'text-white' : 'text-text-main'}`}
              >
                Instalar o app
              </Dialog.Title>
              <Dialog.Close className={isDark ? 'text-zinc-400 hover:text-white transition' : 'text-text-muted hover:text-text-main transition'}>
                <X size={18} />
              </Dialog.Close>
            </div>
            {isIOS ? (
              <ol className={`space-y-3 text-sm ${isDark ? 'text-zinc-300' : 'text-text-muted'}`}>
                <li className="flex items-start gap-2.5">
                  <Share size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    Toque no ícone de{' '}
                    <strong className={isDark ? 'text-white' : 'text-text-main'}>Compartilhar</strong> na barra do
                    Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <SquarePlus size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    Escolha{' '}
                    <strong className={isDark ? 'text-white' : 'text-text-main'}>Adicionar à Tela de Início</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className={`space-y-3 text-sm ${isDark ? 'text-zinc-300' : 'text-text-muted'}`}>
                <li className="flex items-start gap-2.5">
                  <MoreVertical size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    Toque no menu <strong className={isDark ? 'text-white' : 'text-text-main'}>⋮</strong> no canto
                    superior do navegador.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <SquarePlus size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    Escolha{' '}
                    <strong className={isDark ? 'text-white' : 'text-text-main'}>
                      Instalar app / Adicionar à tela inicial
                    </strong>
                    .
                  </span>
                </li>
              </ol>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <button type="button" onClick={promptInstall} className={className}>
      {children ?? (
        <>
          <Download size={16} /> Instalar app
        </>
      )}
    </button>
  );
}
