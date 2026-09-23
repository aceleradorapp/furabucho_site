import * as Dialog from '@radix-ui/react-dialog';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';
import { useConfirm } from '../ConfirmDialogProvider';
import { Avatar } from '../Avatar';
import { SEASON_MONTH_LABELS, nowForDatetimeLocalInput } from '../../lib/pontaFirmeMonths';

export interface PaymentSlot {
  monthDate: string;
  amount: number | null;
  paidAt: string | null;
  paymentId: number | null;
}

export interface Payer {
  id: number;
  userId: number | null;
  name: string;
  avatarUrl: string | null;
  isClaimed: boolean;
  removedAt: string | null;
  monthsPaid: number;
  totalPaid: number;
  payments: PaymentSlot[];
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function PontaFirmePayerModal({
  payer,
  canManage,
  open,
  onOpenChange,
  onChanged,
}: {
  payer: Payer;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [paidAtInput, setPaidAtInput] = useState('');
  const [saving, setSaving] = useState(false);

  function startAdd(index: number) {
    setEditingIndex(index);
    setAmountInput('30');
    setPaidAtInput(nowForDatetimeLocalInput());
  }

  function startEdit(index: number, slot: PaymentSlot) {
    setEditingIndex(index);
    setAmountInput(String(slot.amount ?? ''));
    setPaidAtInput(slot.paidAt ? slot.paidAt.slice(0, 16) : nowForDatetimeLocalInput());
  }

  function cancelEdit() {
    setEditingIndex(null);
  }

  async function saveSlot(slot: PaymentSlot) {
    const amount = Number(amountInput.replace(',', '.'));
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      if (slot.paymentId) {
        await api.patch(`/ponta-firme/payments/${slot.paymentId}`, {
          amount,
          paidAt: new Date(paidAtInput).toISOString(),
        });
      } else {
        await api.post(`/ponta-firme/payers/${payer.id}/payments`, {
          monthDate: slot.monthDate,
          amount,
          paidAt: new Date(paidAtInput).toISOString(),
        });
      }
      setEditingIndex(null);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlot(slot: PaymentSlot) {
    if (!slot.paymentId) return;
    const ok = await confirm({
      title: 'Excluir esse pagamento?',
      description: 'Essa ação não pode ser desfeita.',
      variant: 'danger',
    });
    if (!ok) return;
    await api.delete(`/ponta-firme/payments/${slot.paymentId}`);
    onChanged();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card shadow-2xl focus:outline-none flex flex-col max-h-[85vh]">
          <div className="flex items-center gap-3 p-5 border-b border-border shrink-0">
            <Avatar name={payer.name} avatarUrl={payer.avatarUrl} size={40} />
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-sm font-semibold text-text-main truncate">{payer.name}</Dialog.Title>
              <p className="text-xs text-text-muted">
                {payer.monthsPaid}/12 meses · {formatMoney(payer.totalPaid)}
              </p>
            </div>
            <Dialog.Close className="text-text-muted hover:text-text-main transition">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto p-3 flex flex-col gap-1.5">
            {payer.payments.map((slot, index) => {
              const isEditing = editingIndex === index;
              const label = SEASON_MONTH_LABELS[index];

              return (
                <div key={label} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-main">{label}</span>
                    {slot.amount !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">{formatMoney(slot.amount)}</span>
                        {canManage && !isEditing && (
                          <>
                            <button
                              onClick={() => startEdit(index, slot)}
                              className="text-text-muted hover:text-primary transition p-1"
                              aria-label="Editar pagamento"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => deleteSlot(slot)}
                              className="text-text-muted hover:text-red-600 transition p-1"
                              aria-label="Excluir pagamento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    ) : canManage && !isEditing ? (
                      <button
                        onClick={() => startAdd(index)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition"
                      >
                        <Plus size={13} /> Registrar
                      </button>
                    ) : (
                      <span className="text-xs text-text-faint">Não pago</span>
                    )}
                  </div>

                  {slot.amount !== null && slot.paidAt && !isEditing && (
                    <p className="text-[11px] text-text-muted mt-1">Pago em {formatDateTime(slot.paidAt)}</p>
                  )}

                  {isEditing && (
                    <div className="mt-2.5 flex flex-col gap-2 bg-card-subtle rounded-lg p-2.5">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-text-muted uppercase tracking-wide">Valor (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={amountInput}
                            onChange={(e) => setAmountInput(e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-text-muted uppercase tracking-wide">Data e hora</label>
                          <input
                            type="datetime-local"
                            value={paidAtInput}
                            onChange={(e) => setPaidAtInput(e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-text-muted hover:text-text-main transition px-2 py-1"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveSlot(slot)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-full px-3 py-1.5 transition disabled:opacity-60"
                        >
                          <Check size={13} /> Salvar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
