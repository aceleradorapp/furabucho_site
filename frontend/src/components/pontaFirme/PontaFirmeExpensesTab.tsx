import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';
import { useConfirm } from '../ConfirmDialogProvider';

export interface ExpenseItem {
  id: number;
  label: string;
  amount: number;
}

export interface ExpenseCard {
  id: number;
  title: string;
  items: ExpenseItem[];
  total: number;
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function AddItemForm({ cardId, onAdded }: { cardId: number; onAdded: () => void }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const value = Number(amount.replace(',', '.'));
    if (!label.trim() || !value || value <= 0) return;
    setSaving(true);
    try {
      await api.post(`/ponta-firme/expenses/${cardId}/items`, { label: label.trim(), amount: value });
      setLabel('');
      setAmount('');
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Descrição (ex: Chácara)"
        className="flex-1 min-w-0 rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        type="number"
        step="0.01"
        placeholder="R$"
        className="w-24 rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
      />
      <button
        onClick={save}
        disabled={saving}
        className="shrink-0 inline-flex items-center justify-center rounded-full bg-primary hover:bg-primary-hover text-white p-2 transition disabled:opacity-60"
        aria-label="Adicionar gasto"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function ExpenseCardView({
  card,
  canManage,
  onChanged,
}: {
  card: ExpenseCard;
  canManage: boolean;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(card.title);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemLabelInput, setItemLabelInput] = useState('');
  const [itemAmountInput, setItemAmountInput] = useState('');

  async function saveTitle() {
    if (!titleInput.trim()) return;
    await api.patch(`/ponta-firme/expenses/${card.id}`, { title: titleInput.trim() });
    setEditingTitle(false);
    onChanged();
  }

  async function deleteCard() {
    const ok = await confirm({
      title: `Excluir o card "${card.title}"?`,
      description: 'Todos os gastos registrados nele também serão excluídos. Essa ação não pode ser desfeita.',
      variant: 'danger',
    });
    if (!ok) return;
    await api.delete(`/ponta-firme/expenses/${card.id}`);
    onChanged();
  }

  function startEditItem(item: ExpenseItem) {
    setEditingItemId(item.id);
    setItemLabelInput(item.label);
    setItemAmountInput(String(item.amount));
  }

  async function saveItem(itemId: number) {
    const value = Number(itemAmountInput.replace(',', '.'));
    if (!itemLabelInput.trim() || !value || value <= 0) return;
    await api.patch(`/ponta-firme/expense-items/${itemId}`, { label: itemLabelInput.trim(), amount: value });
    setEditingItemId(null);
    onChanged();
  }

  async function deleteItem(itemId: number) {
    const ok = await confirm({ title: 'Excluir esse gasto?', variant: 'danger' });
    if (!ok) return;
    await api.delete(`/ponta-firme/expense-items/${itemId}`);
    onChanged();
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        {editingTitle ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              autoFocus
              className="flex-1 rounded-lg border border-border px-2.5 py-1.5 text-sm font-semibold outline-none focus:border-primary"
            />
            <button onClick={saveTitle} className="text-primary hover:text-primary-hover transition p-1">
              <Check size={16} />
            </button>
            <button
              onClick={() => {
                setEditingTitle(false);
                setTitleInput(card.title);
              }}
              className="text-text-muted hover:text-text-main transition p-1"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <h3 className="font-display uppercase tracking-wide text-sm text-text-main">{card.title}</h3>
        )}

        {canManage && !editingTitle && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditingTitle(true)}
              className="text-text-muted hover:text-primary transition p-1"
              aria-label="Editar título"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={deleteCard}
              className="text-text-muted hover:text-red-600 transition p-1"
              aria-label="Excluir card"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {card.items.map((item) => (
          <div key={item.id}>
            {editingItemId === item.id ? (
              <div className="flex items-center gap-2">
                <input
                  value={itemLabelInput}
                  onChange={(e) => setItemLabelInput(e.target.value)}
                  className="flex-1 min-w-0 rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
                <input
                  value={itemAmountInput}
                  onChange={(e) => setItemAmountInput(e.target.value)}
                  type="number"
                  step="0.01"
                  className="w-24 rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
                <button onClick={() => saveItem(item.id)} className="text-primary hover:text-primary-hover transition p-1">
                  <Check size={15} />
                </button>
                <button onClick={() => setEditingItemId(null)} className="text-text-muted hover:text-text-main transition p-1">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-text-main">{item.label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-text-muted">{formatMoney(item.amount)}</span>
                  {canManage && (
                    <>
                      <button
                        onClick={() => startEditItem(item)}
                        className="text-text-faint hover:text-primary transition p-0.5"
                        aria-label="Editar gasto"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-text-faint hover:text-red-600 transition p-0.5"
                        aria-label="Excluir gasto"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {card.items.length === 0 && <p className="text-xs text-text-faint py-1">Nenhum gasto ainda.</p>}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Total</span>
        <span className="text-sm font-bold text-text-main">{formatMoney(card.total)}</span>
      </div>

      {canManage && <AddItemForm cardId={card.id} onAdded={onChanged} />}
    </div>
  );
}

export function PontaFirmeExpensesTab({
  seasonId,
  cards,
  canManage,
  onChanged,
}: {
  seasonId: number;
  cards: ExpenseCard[];
  canManage: boolean;
  onChanged: () => void;
}) {
  const [addingCard, setAddingCard] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  async function createCard() {
    if (!newTitle.trim()) return;
    await api.post(`/ponta-firme/seasons/${seasonId}/expenses`, { title: newTitle.trim() });
    setNewTitle('');
    setAddingCard(false);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3">
      {cards.map((card) => (
        <ExpenseCardView key={card.id} card={card} canManage={canManage} onChanged={onChanged} />
      ))}

      {cards.length === 0 && !addingCard && (
        <p className="text-sm text-text-muted text-center py-10">Nenhum gasto registrado ainda.</p>
      )}

      {canManage && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-4">
          {addingCard ? (
            <div className="flex items-center gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                placeholder='Título (ex: "Festa do 15")'
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={createCard}
                className="shrink-0 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-full px-4 py-2 transition"
              >
                Criar
              </button>
              <button
                onClick={() => {
                  setAddingCard(false);
                  setNewTitle('');
                }}
                className="shrink-0 text-sm text-text-muted hover:text-text-main px-2"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCard(true)}
              className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover transition"
            >
              <Plus size={16} /> Novo card de gastos
            </button>
          )}
        </div>
      )}
    </div>
  );
}
