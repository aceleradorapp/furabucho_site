import { Plus, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Avatar } from '../Avatar';
import { useConfirm } from '../ConfirmDialogProvider';
import { PontaFirmeEventPayerModal, type EventPayer } from './PontaFirmeEventPayerModal';
import { PaymentTypeSelector, type PaymentType } from './PaymentTypeSelector';

interface ClaimableUser {
  id: number;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
  email: string;
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative flex-1">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">R$</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="number"
        step="0.01"
        min="0"
        className="w-full rounded-lg border border-border pl-8 pr-3 py-1.5 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function PersonNameField({
  seasonId,
  pickedUser,
  freeText,
  onPick,
  onTextChange,
  onClearPicked,
}: {
  seasonId: number;
  pickedUser: ClaimableUser | null;
  freeText: string;
  onPick: (user: ClaimableUser) => void;
  onTextChange: (text: string) => void;
  onClearPicked: () => void;
}) {
  const [users, setUsers] = useState<ClaimableUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    api.get<ClaimableUser[]>(`/ponta-firme/event-claimable-users?seasonId=${seasonId}`).then(setUsers);
  }, [seasonId]);

  const suggestions = useMemo(() => {
    const q = freeText.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter((u) => u.name.toLowerCase().includes(q) || (u.nickname ?? '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [users, freeText]);

  if (pickedUser) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-card-subtle px-2.5 py-1.5">
        <Avatar name={pickedUser.nickname || pickedUser.name} avatarUrl={pickedUser.avatarUrl} size={24} />
        <span className="text-sm text-text-main flex-1">{pickedUser.nickname || pickedUser.name}</span>
        <span className="text-[10px] text-primary font-medium shrink-0">membro cadastrado</span>
        <button onClick={onClearPicked} className="text-xs text-text-muted hover:text-text-main shrink-0">
          trocar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={freeText}
        onChange={(e) => {
          onTextChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder="Nome da pessoa"
        className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((u) => (
            <button
              key={u.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(u);
                setShowSuggestions(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-card-subtle transition text-left"
            >
              <Avatar name={u.nickname || u.name} avatarUrl={u.avatarUrl} size={22} />
              <span className="text-sm text-text-main truncate flex-1">{u.nickname || u.name}</span>
              <span className="text-[10px] text-primary shrink-0">membro</span>
            </button>
          ))}
        </div>
      )}
      {freeText.trim() && (
        <p className="text-[11px] text-text-muted mt-1">
          {suggestions.length > 0
            ? 'Tem gente cadastrada com nome parecido — clique acima se for a mesma pessoa, ou continue digitando pra cadastrar assim mesmo, sem conta.'
            : 'Ninguém cadastrado com esse nome — vai ser cadastrado só com o nome, sem conta.'}
        </p>
      )}
    </div>
  );
}

export function PontaFirmeEventPayersTab({
  seasonId,
  payers,
  canManage,
  onChanged,
}: {
  seasonId: number;
  payers: EventPayer[];
  canManage: boolean;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [selectedPayerId, setSelectedPayerId] = useState<number | null>(null);
  const selectedPayer = payers.find((p) => p.id === selectedPayerId) ?? null;
  const [formOpen, setFormOpen] = useState(false);
  const [nameText, setNameText] = useState('');
  const [newValue, setNewValue] = useState('30');
  const [payerPaymentType, setPayerPaymentType] = useState<PaymentType>('inteiro');
  const [pickedUser, setPickedUser] = useState<ClaimableUser | null>(null);
  const [guestRows, setGuestRows] = useState<{ name: string; paymentType: PaymentType }[]>([
    { name: '', paymentType: 'inteiro' },
  ]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const totalArrecadadoEvento = payers.reduce((sum, p) => sum + p.total, 0);

  function openAddForm() {
    setFormOpen(true);
    setGuestRows([{ name: '', paymentType: 'inteiro' }]);
    setPayerPaymentType('inteiro');
    setFormError(null);
  }

  function closeAddForm() {
    setFormOpen(false);
    setPickedUser(null);
    setNameText('');
    setNewValue('30');
    setPayerPaymentType('inteiro');
    setGuestRows([{ name: '', paymentType: 'inteiro' }]);
    setFormError(null);
  }

  function pickUser(user: ClaimableUser) {
    setPickedUser(user);
    setNameText(user.nickname || user.name);
    setFormError(null);
  }

  function clearPickedUser() {
    setPickedUser(null);
    setNameText('');
  }

  function updateGuestRow(index: number, patch: Partial<{ name: string; paymentType: PaymentType }>) {
    setGuestRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addGuestRow() {
    setGuestRows((prev) => [...prev, { name: '', paymentType: 'inteiro' }]);
  }

  function removeGuestRow(index: number) {
    setGuestRows((prev) => (prev.length === 1 ? [{ name: '', paymentType: 'inteiro' }] : prev.filter((_, i) => i !== index)));
  }

  async function createPayer() {
    setFormError(null);

    if (!pickedUser && !nameText.trim()) {
      setFormError('Digite o nome da pessoa.');
      return;
    }
    const value = Number(newValue.replace(',', '.'));
    if (!value || value <= 0) {
      setFormError('Informe um valor por pessoa maior que zero.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/ponta-firme/seasons/${seasonId}/event-payers`, {
        ...(pickedUser ? { userId: pickedUser.id } : { displayName: nameText.trim() }),
        valuePerPerson: value,
        paymentType: payerPaymentType,
        guests: guestRows
          .filter((g) => g.name.trim())
          .map((g) => ({ name: g.name.trim(), paymentType: g.paymentType })),
      });
      closeAddForm();
      onChanged();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Não foi possível adicionar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  async function deletePayer(payer: EventPayer) {
    const ok = await confirm({
      title: `Remover ${payer.name} da lista de pagantes?`,
      description: payer.quantity > 0 ? `Isso também remove as ${payer.quantity} pessoa(s) vinculadas a ele(a).` : undefined,
      variant: 'danger',
    });
    if (!ok) return;
    await api.delete(`/ponta-firme/event-payers/${payer.id}`);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wide">Arrecadado com o evento</p>
          <p className="text-lg font-bold text-text-main">{formatMoney(totalArrecadadoEvento)}</p>
        </div>
        <Users size={22} className="text-primary" />
      </div>

      {payers.map((payer) => (
        <div
          key={payer.id}
          className="bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition flex items-center gap-3"
        >
          <button onClick={() => setSelectedPayerId(payer.id)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
            <Avatar name={payer.name} avatarUrl={payer.avatarUrl} size={38} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-main truncate">
                {payer.name}
                {!payer.isClaimed && <span className="ml-1.5 text-[10px] text-amber-600 font-normal">sem cadastro</span>}
              </p>
              <p className="text-xs text-text-muted">
                {payer.quantity} {payer.quantity === 1 ? 'pessoa' : 'pessoas'} · {formatMoney(payer.valuePerPerson)}/pessoa
              </p>
            </div>
            <p className="text-sm font-bold text-text-main shrink-0">{formatMoney(payer.total)}</p>
          </button>
          {canManage && (
            <button
              onClick={() => deletePayer(payer)}
              className="text-text-faint hover:text-red-600 transition p-1 shrink-0"
              aria-label="Excluir pagante"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ))}

      {payers.length === 0 && !formOpen && (
        <p className="text-sm text-text-muted text-center py-10">Nenhum pagante do evento ainda.</p>
      )}

      {canManage && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-4">
          {!formOpen ? (
            <button
              onClick={openAddForm}
              className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover transition"
            >
              <Plus size={16} /> Adicionar pagante
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-medium text-text-muted mb-1.5">Nome da pessoa (responsável)</p>
                <PersonNameField
                  seasonId={seasonId}
                  pickedUser={pickedUser}
                  freeText={nameText}
                  onPick={pickUser}
                  onTextChange={setNameText}
                  onClearPicked={clearPickedUser}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-text-muted">Pagamento do responsável</span>
                  <PaymentTypeSelector value={payerPaymentType} onChange={setPayerPaymentType} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted shrink-0">Valor por pessoa (inteiro)</label>
                <MoneyInput value={newValue} onChange={setNewValue} />
              </div>

              <div>
                <p className="text-xs font-medium text-text-muted mb-1.5">
                  Quem mais vai (opcional agora, pode completar depois)
                </p>
                <div className="flex flex-col gap-1.5">
                  {guestRows.map((row, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={row.name}
                        onChange={(e) => updateGuestRow(index, { name: e.target.value })}
                        placeholder={`Pessoa ${index + 1}`}
                        className="flex-1 min-w-0 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
                      />
                      <PaymentTypeSelector
                        value={row.paymentType}
                        onChange={(paymentType) => updateGuestRow(index, { paymentType })}
                      />
                      <button
                        onClick={() => removeGuestRow(index)}
                        className="text-text-faint hover:text-red-600 transition p-1 shrink-0"
                        aria-label="Remover campo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addGuestRow}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition"
                >
                  <Plus size={13} /> Adicionar mais uma pessoa
                </button>
              </div>

              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="flex items-center gap-2 justify-end">
                <button onClick={closeAddForm} className="text-xs text-text-muted hover:text-text-main px-2 py-1">
                  Cancelar
                </button>
                <button
                  onClick={createPayer}
                  disabled={saving}
                  className="text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-full px-4 py-2 transition disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedPayer && (
        <PontaFirmeEventPayerModal
          payer={selectedPayer}
          canManage={canManage}
          open={!!selectedPayer}
          onOpenChange={(open) => !open && setSelectedPayerId(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
