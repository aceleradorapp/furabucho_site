import * as Dialog from '@radix-ui/react-dialog';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Avatar } from '../Avatar';
import { useConfirm } from '../ConfirmDialogProvider';
import { PaymentTypeSelector, type PaymentType } from './PaymentTypeSelector';

export interface EventGuest {
  id: number;
  name: string;
  paymentType: PaymentType;
  amount: number;
}

export interface EventPayer {
  id: number;
  userId: number | null;
  name: string;
  avatarUrl: string | null;
  isClaimed: boolean;
  valuePerPerson: number;
  paymentType: PaymentType;
  payerAmount: number;
  guests: EventGuest[];
  quantity: number;
  total: number;
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PontaFirmeEventPayerModal({
  payer,
  canManage,
  open,
  onOpenChange,
  onChanged,
}: {
  payer: EventPayer;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [newGuestName, setNewGuestName] = useState('');
  const [editingGuestId, setEditingGuestId] = useState<number | null>(null);
  const [editingGuestName, setEditingGuestName] = useState('');
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(payer.valuePerPerson));
  const [error, setError] = useState<string | null>(null);

  function reportError(err: unknown, fallback: string) {
    setError(err instanceof ApiError ? err.message : fallback);
  }

  async function setPayerPaymentType(type: PaymentType) {
    setError(null);
    try {
      await api.patch(`/ponta-firme/event-payers/${payer.id}`, { paymentType: type });
      onChanged();
    } catch (err) {
      reportError(err, 'Não foi possível salvar. Tente de novo.');
    }
  }

  async function setGuestPaymentType(guestId: number, type: PaymentType) {
    setError(null);
    try {
      await api.patch(`/ponta-firme/event-guests/${guestId}`, { paymentType: type });
      onChanged();
    } catch (err) {
      reportError(err, 'Não foi possível salvar. Tente de novo.');
    }
  }

  async function addGuest() {
    if (!newGuestName.trim()) {
      setError('Digite o nome da pessoa antes de adicionar.');
      return;
    }
    setError(null);
    try {
      await api.post(`/ponta-firme/event-payers/${payer.id}/guests`, { name: newGuestName.trim() });
      setNewGuestName('');
      onChanged();
    } catch (err) {
      reportError(err, 'Não foi possível adicionar essa pessoa. Tente de novo.');
    }
  }

  function startEditGuest(guest: EventGuest) {
    setEditingGuestId(guest.id);
    setEditingGuestName(guest.name);
    setError(null);
  }

  async function saveGuest(guestId: number) {
    if (!editingGuestName.trim()) {
      setError('Digite o nome da pessoa.');
      return;
    }
    setError(null);
    try {
      await api.patch(`/ponta-firme/event-guests/${guestId}`, { name: editingGuestName.trim() });
      setEditingGuestId(null);
      onChanged();
    } catch (err) {
      reportError(err, 'Não foi possível salvar. Tente de novo.');
    }
  }

  async function deleteGuest(guestId: number) {
    const ok = await confirm({ title: 'Remover essa pessoa da lista?', variant: 'danger' });
    if (!ok) return;
    setError(null);
    try {
      await api.delete(`/ponta-firme/event-guests/${guestId}`);
      onChanged();
    } catch (err) {
      reportError(err, 'Não foi possível remover. Tente de novo.');
    }
  }

  async function saveValue() {
    const value = Number(valueInput.replace(',', '.'));
    if (!value || value <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }
    setError(null);
    try {
      await api.patch(`/ponta-firme/event-payers/${payer.id}`, { valuePerPerson: value });
      setEditingValue(false);
      onChanged();
    } catch (err) {
      reportError(err, 'Não foi possível salvar. Tente de novo.');
    }
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
                {payer.quantity} {payer.quantity === 1 ? 'pessoa' : 'pessoas'} · Total {formatMoney(payer.total)}
              </p>
            </div>
            <Dialog.Close className="text-text-muted hover:text-text-main transition">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="p-4 border-b border-border shrink-0">
            {editingValue ? (
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted shrink-0">Valor por pessoa</label>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">
                    R$
                  </span>
                  <input
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    className="w-full rounded-lg border border-border pl-7 pr-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                </div>
                <button onClick={saveValue} className="text-primary hover:text-primary-hover transition p-1">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingValue(false)} className="text-text-muted hover:text-text-main transition p-1">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted">
                  Valor por pessoa: <span className="font-semibold text-text-main">{formatMoney(payer.valuePerPerson)}</span>
                </p>
                {canManage && (
                  <button
                    onClick={() => {
                      setEditingValue(true);
                      setValueInput(String(payer.valuePerPerson));
                    }}
                    className="text-text-muted hover:text-primary transition p-1"
                    aria-label="Editar valor por pessoa"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="overflow-y-auto p-4 flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">Quem vai</h3>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <div className="min-w-0">
                <span className="text-sm text-text-main font-medium truncate block">{payer.name}</span>
                <span className="text-[10px] text-text-muted">responsável · {formatMoney(payer.payerAmount)}</span>
              </div>
              {canManage ? (
                <PaymentTypeSelector value={payer.paymentType} onChange={setPayerPaymentType} />
              ) : (
                <span className="text-xs text-text-muted shrink-0">
                  {payer.paymentType === 'inteiro' ? 'Inteiro' : payer.paymentType === 'meio' ? 'Meio' : 'Não paga'}
                </span>
              )}
            </div>

            {payer.guests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                {editingGuestId === guest.id ? (
                  <>
                    <input
                      value={editingGuestName}
                      onChange={(e) => setEditingGuestName(e.target.value)}
                      autoFocus
                      className="flex-1 rounded-lg border border-border px-2 py-1 text-sm outline-none focus:border-primary"
                    />
                    <button onClick={() => saveGuest(guest.id)} className="text-primary hover:text-primary-hover transition p-1">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingGuestId(null)} className="text-text-muted hover:text-text-main transition p-1">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-text-main block truncate">{guest.name}</span>
                      <span className="text-[10px] text-text-muted">{formatMoney(guest.amount)}</span>
                    </div>
                    {canManage ? (
                      <>
                        <PaymentTypeSelector
                          value={guest.paymentType}
                          onChange={(type) => setGuestPaymentType(guest.id, type)}
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEditGuest(guest)}
                            className="text-text-faint hover:text-primary transition p-1"
                            aria-label="Editar nome"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteGuest(guest.id)}
                            className="text-text-faint hover:text-red-600 transition p-1"
                            aria-label="Remover"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-text-muted shrink-0">
                        {guest.paymentType === 'inteiro' ? 'Inteiro' : guest.paymentType === 'meio' ? 'Meio' : 'Não paga'}
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2 mt-1">{error}</p>
            )}

            {canManage && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                  placeholder="Nome da pessoa"
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={addGuest}
                  className="shrink-0 inline-flex items-center justify-center rounded-full bg-primary hover:bg-primary-hover text-white p-2 transition"
                  aria-label="Adicionar pessoa"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
