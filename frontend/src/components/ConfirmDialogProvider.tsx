import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise((resolve) => setPending({ ...options, resolve }));
  }, []);

  function respond(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  const isDanger = pending?.variant === 'danger';

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={!!pending} onOpenChange={(open) => !open && respond(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[201] w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl p-6 focus:outline-none">
            {pending && (
              <>
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${
                    isDanger ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {isDanger ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
                </div>
                <AlertDialog.Title className="font-semibold text-text-main text-base mb-1.5">
                  {pending.title}
                </AlertDialog.Title>
                {pending.description && (
                  <AlertDialog.Description className="text-sm text-text-muted mb-6 leading-relaxed">
                    {pending.description}
                  </AlertDialog.Description>
                )}
                {!pending.description && <div className="mb-4" />}
                <div className="flex justify-end gap-3">
                  <AlertDialog.Cancel asChild>
                    <button
                      type="button"
                      onClickCapture={() => respond(false)}
                      className="text-sm font-medium rounded-full border border-border px-4 py-2 hover:bg-card-subtle transition"
                    >
                      {pending.cancelLabel ?? 'Cancelar'}
                    </button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <button
                      type="button"
                      onClickCapture={() => respond(true)}
                      className={`text-sm font-medium rounded-full px-4 py-2 text-white transition ${
                        isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-hover'
                      }`}
                    >
                      {pending.confirmLabel ?? 'Confirmar'}
                    </button>
                  </AlertDialog.Action>
                </div>
              </>
            )}
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de ConfirmDialogProvider');
  return ctx;
}
