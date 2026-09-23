import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { SEASON_MONTH_LABELS_SHORT } from '../../lib/pontaFirmeMonths';
import type { Payer } from './PontaFirmePayerModal';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PontaFirmeFullTableModal({
  payers,
  seasonLabel,
  open,
  onOpenChange,
}: {
  payers: Payer[];
  seasonLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card shadow-2xl focus:outline-none flex flex-col max-h-[88vh]">
          <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
            <Dialog.Title className="font-display uppercase tracking-wider text-base text-text-main">
              Tabela completa · {seasonLabel}
            </Dialog.Title>
            <Dialog.Close className="text-text-muted hover:text-text-main transition">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="overflow-auto p-4">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-card text-left px-3 py-2 font-semibold text-text-main border-b border-border">
                    Integrante
                  </th>
                  {SEASON_MONTH_LABELS_SHORT.map((m) => (
                    <th key={m} className="px-2.5 py-2 font-semibold text-text-muted border-b border-border text-center">
                      {m}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-semibold text-text-main border-b border-border text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {payers.map((p) => (
                  <tr key={p.id} className={p.removedAt ? 'opacity-50' : ''}>
                    <td className="sticky left-0 bg-card px-3 py-2 font-medium text-text-main border-b border-border whitespace-nowrap">
                      {p.name}
                      {p.removedAt && <span className="ml-1.5 text-[10px] text-red-500">(removido)</span>}
                    </td>
                    {p.payments.map((slot, i) => (
                      <td key={i} className="px-2.5 py-2 border-b border-border text-center text-text-muted">
                        {slot.amount !== null ? formatMoney(slot.amount).replace('R$', '').trim() : '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2 border-b border-border text-right font-semibold text-text-main whitespace-nowrap">
                      {formatMoney(p.totalPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
