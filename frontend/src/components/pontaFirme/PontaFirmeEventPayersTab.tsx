import { Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Avatar } from '../Avatar';
import { useConfirm } from '../ConfirmDialogProvider';
import { PontaFirmeEventPayerModal, type EventPayer } from './PontaFirmeEventPayerModal';

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

function UserPicker({ seasonId, onPick }: { seasonId: number; onPick: (user: ClaimableUser) => void }) {
  const [users, setUsers] = useState<ClaimableUser[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<ClaimableUser[]>(`/ponta-firme/event-claimable-users?seasonId=${seasonId}`).then(setUsers);
  }, [seasonId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || (u.nickname ?? '').toLowerCase().includes(q));
  }, [users, search]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar membro cadastrado..."
          className="w-full rounded-lg border border-border pl-8 pr-3 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
        {filtered.map((u) => (
          <button
            key={u.id}
            onClick={() => onPick(u)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card-subtle transition text-left"
          >
            <Avatar name={u.nickname || u.name} avatarUrl={u.avatarUrl} size={26} />
            <span className="text-sm text-text-main truncate">{u.nickname || u.name}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-text-muted py-3 text-center px-2">
            Nenhum membro encontrado. Se a pessoa ainda não tem cadastro, clique em{' '}
            <strong>"ou digitar um nome"</strong> ali em cima.
          </p>
        )}
      </div>
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
  const [addMode, setAddMode] = useState<'closed' | 'user' | 'name'>('closed');
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('30');
  const [pickedUser, setPickedUser] = useState<ClaimableUser | null>(null);
  const [guestNames, setGuestNames] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const totalArrecadadoEvento = payers.reduce((sum, p) => sum + p.total, 0);

  function openAddForm() {
    setAddMode('user');
    setGuestNames(['']);
    setFormError(null);
  }

  function closeAddForm() {
    setAddMode('closed');
    setPickedUser(null);
    setNewName('');
    setNewValue('30');
    setGuestNames(['']);
    setFormError(null);
  }

  function switchAddMode(mode: 'user' | 'name') {
    setAddMode(mode);
    setFormError(null);
  }

  function updateGuestName(index: number, value: string) {
    setGuestNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  }

  function addGuestNameField() {
    setGuestNames((prev) => [...prev, '']);
  }

  function removeGuestNameField(index: number) {
    setGuestNames((prev) => (prev.length === 1 ? [''] : prev.filter((_, i) => i !== index)));
  }

  async function createPayer() {
    setFormError(null);

    if (addMode === 'user' && !pickedUser) {
      setFormError('Selecione um membro na busca, ou clique em "ou digitar um nome" pra cadastrar alguém sem conta.');
      return;
    }
    if (addMode === 'name' && !newName.trim()) {
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
        ...(addMode === 'user' ? { userId: pickedUser!.id } : { displayName: newName.trim() }),
        valuePerPerson: value,
        guestNames: guestNames.map((n) => n.trim()).filter(Boolean),
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

      {payers.length === 0 && addMode === 'closed' && (
        <p className="text-sm text-text-muted text-center py-10">Nenhum pagante do evento ainda.</p>
      )}

      {canManage && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-4">
          {addMode === 'closed' && (
            <button
              onClick={openAddForm}
              className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover transition"
            >
              <Plus size={16} /> Adicionar pagante
            </button>
          )}

          {addMode !== 'closed' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-text-muted">
                  {addMode === 'user' ? 'Buscar membro cadastrado' : 'Nome de quem ainda não tem cadastro'}
                </p>
                <button
                  onClick={() => switchAddMode(addMode === 'user' ? 'name' : 'user')}
                  className="text-xs text-primary hover:text-primary-hover"
                >
                  {addMode === 'user' ? 'ou digitar um nome' : 'ou buscar membro'}
                </button>
              </div>

              {addMode === 'user' ? (
                pickedUser ? (
                  <div className="flex items-center gap-2 rounded-lg bg-card-subtle px-2.5 py-1.5">
                    <Avatar name={pickedUser.nickname || pickedUser.name} avatarUrl={pickedUser.avatarUrl} size={24} />
                    <span className="text-sm text-text-main flex-1">{pickedUser.nickname || pickedUser.name}</span>
                    <button onClick={() => setPickedUser(null)} className="text-xs text-text-muted hover:text-text-main">
                      trocar
                    </button>
                  </div>
                ) : (
                  <UserPicker seasonId={seasonId} onPick={setPickedUser} />
                )
              ) : (
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                />
              )}

              <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted shrink-0">Valor por pessoa</label>
                <MoneyInput value={newValue} onChange={setNewValue} />
              </div>

              <div>
                <p className="text-xs font-medium text-text-muted mb-1.5">Quem vai (opcional agora, pode completar depois)</p>
                <div className="flex flex-col gap-1.5">
                  {guestNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={name}
                        onChange={(e) => updateGuestName(index, e.target.value)}
                        placeholder={`Pessoa ${index + 1}`}
                        className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => removeGuestNameField(index)}
                        className="text-text-faint hover:text-red-600 transition p-1 shrink-0"
                        aria-label="Remover campo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addGuestNameField}
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
