import * as Dialog from '@radix-ui/react-dialog';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';
import { Avatar } from '../Avatar';
import { useConfirm } from '../ConfirmDialogProvider';

export interface EventGuest {
  id: number;
  name: string;
}

export interface EventPayer {
  id: number;
  userId: number | null;
  name: string;
  avatarUrl: string | null;
  isClaimed: boolean;
  valuePerPerson: number;
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

  async function addGuest() {
    if (!newGuestName.trim()) return;
    await api.post(`/ponta-firme/event-payers/${payer.id}/guests`, { name: newGuestName.trim() });
    setNewGuestName('');
    onChanged();
  }

  function startEditGuest(guest: EventGuest) {
    setEditingGuestId(guest.id);
    setEditingGuestName(guest.name);
  }

  async function saveGuest(guestId: number) {
    if (!editingGuestName.trim()) return;
    await api.patch(`/ponta-firme/event-guests/${guestId}`, { name: editingGuestName.trim() });
    setEditingGuestId(null);
    onChanged();
  }

  async function deleteGuest(guestId: number) {
    const ok = await confirm({ title: 'Remover essa pessoa da lista?', variant: 'danger' });
    if (!ok) return;
    await api.delete(`/ponta-firme/event-guests/${guestId}`);
    onChanged();
  }

  async function saveValue() {
    const value = Number(valueInput.replace(',', '.'));
    if (!value || value <= 0) return;
    await api.patch(`/ponta-firme/event-payers/${payer.id}`, { valuePerPerson: value });
    setEditingValue(false);
    onChanged();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl focus:outline-none flex flex-col max-h-[85vh]">
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
                    <span className="text-sm text-text-main">{guest.name}</span>
                    {canManage && (
                      <div className="flex items-center gap-1">
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
                    )}
                  </>
                )}
              </div>
            ))}

            {payer.guests.length === 0 && <p className="text-xs text-text-faint py-2">Ninguém adicionado ainda.</p>}

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
