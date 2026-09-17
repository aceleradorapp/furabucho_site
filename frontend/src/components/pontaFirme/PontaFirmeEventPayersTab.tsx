import { Plus, Search, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
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
        {filtered.length === 0 && <p className="text-xs text-text-muted py-3 text-center">Nenhum membro encontrado.</p>}
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

  const totalArrecadadoEvento = payers.reduce((sum, p) => sum + p.total, 0);

  async function createPayer() {
    const value = Number(newValue.replace(',', '.'));
    if (!value || value <= 0) return;
    if (addMode === 'user' && !pickedUser) return;
    if (addMode === 'name' && !newName.trim()) return;

    await api.post(`/ponta-firme/seasons/${seasonId}/event-payers`, {
      ...(addMode === 'user' ? { userId: pickedUser!.id } : { displayName: newName.trim() }),
      valuePerPerson: value,
    });
    setAddMode('closed');
    setNewName('');
    setNewValue('30');
    setPickedUser(null);
    onChanged();
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
        <button
          key={payer.id}
          onClick={() => setSelectedPayerId(payer.id)}
          className="text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition flex items-center gap-3"
        >
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
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-text-main">{formatMoney(payer.total)}</p>
          </div>
          {canManage && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                deletePayer(payer);
              }}
              className="text-text-faint hover:text-red-600 transition p-1 shrink-0"
              aria-label="Excluir pagante"
            >
              <Trash2 size={15} />
            </span>
          )}
        </button>
      ))}

      {payers.length === 0 && addMode === 'closed' && (
        <p className="text-sm text-text-muted text-center py-10">Nenhum pagante do evento ainda.</p>
      )}

      {canManage && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-4">
          {addMode === 'closed' && (
            <button
              onClick={() => setAddMode('user')}
              className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover transition"
            >
              <Plus size={16} /> Adicionar pagante
            </button>
          )}

          {addMode !== 'closed' && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-text-muted">
                  {addMode === 'user' ? 'Buscar membro cadastrado' : 'Nome de quem ainda não tem cadastro'}
                </p>
                <button
                  onClick={() => setAddMode(addMode === 'user' ? 'name' : 'user')}
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
                <input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  type="number"
                  step="0.01"
                  className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    setAddMode('closed');
                    setPickedUser(null);
                    setNewName('');
                  }}
                  className="text-xs text-text-muted hover:text-text-main px-2 py-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={createPayer}
                  className="text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-full px-4 py-2 transition"
                >
                  Adicionar
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
