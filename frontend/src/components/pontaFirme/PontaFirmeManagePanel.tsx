import * as Dialog from '@radix-ui/react-dialog';
import { Link2, Plus, RotateCcw, Search, Trash2, UserX, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { useConfirm } from '../ConfirmDialogProvider';
import { Avatar } from '../Avatar';
import type { Payer } from './PontaFirmePayerModal';

interface ClaimableUser {
  id: number;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
  email: string;
  alreadyLinkedElsewhere?: boolean;
}

function UserPicker({ seasonId, onPick }: { seasonId: number; onPick: (user: ClaimableUser) => void }) {
  const [users, setUsers] = useState<ClaimableUser[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<ClaimableUser[]>(`/ponta-firme/claimable-users?seasonId=${seasonId}&includeLinked=1`).then(setUsers);
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
      <div className="max-h-52 overflow-y-auto flex flex-col gap-1">
        {filtered.map((u) => (
          <button
            key={u.id}
            onClick={() => onPick(u)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card-subtle transition text-left"
          >
            <Avatar name={u.nickname || u.name} avatarUrl={u.avatarUrl} size={26} />
            <span className="text-sm text-text-main truncate flex-1">{u.nickname || u.name}</span>
            {u.alreadyLinkedElsewhere && (
              <span
                className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0"
                title="Essa conta já está em outro registro nessa temporada — ao selecionar, os pagamentos são juntados aqui e o outro registro é removido."
              >
                juntar registros
              </span>
            )}
          </button>
        ))}
        {filtered.length === 0 && <p className="text-xs text-text-muted py-3 text-center">Nenhum membro encontrado.</p>}
      </div>
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
    api.get<ClaimableUser[]>(`/ponta-firme/claimable-users?seasonId=${seasonId}`).then(setUsers);
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
        placeholder="Nome completo"
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

export function PontaFirmeManagePanel({
  seasonId,
  payers,
  open,
  onOpenChange,
  onChanged,
}: {
  seasonId: number;
  payers: Payer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [formOpen, setFormOpen] = useState(false);
  const [nameText, setNameText] = useState('');
  const [pickedUser, setPickedUser] = useState<ClaimableUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [claimingPayerId, setClaimingPayerId] = useState<number | null>(null);

  function openAddForm() {
    setFormOpen(true);
    setFormError(null);
  }

  function closeAddForm() {
    setFormOpen(false);
    setPickedUser(null);
    setNameText('');
    setFormError(null);
  }

  async function createPayer() {
    setFormError(null);
    if (!pickedUser && !nameText.trim()) {
      setFormError('Digite o nome da pessoa.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/ponta-firme/seasons/${seasonId}/payers`, {
        ...(pickedUser ? { userId: pickedUser.id } : { displayName: nameText.trim() }),
      });
      closeAddForm();
      onChanged();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Não foi possível adicionar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  async function claimUser(payerId: number, user: ClaimableUser) {
    await api.patch(`/ponta-firme/payers/${payerId}`, { userId: user.id });
    setClaimingPayerId(null);
    onChanged();
  }

  async function toggleRemoved(payer: Payer) {
    await api.patch(`/ponta-firme/payers/${payer.id}`, { removed: !payer.removedAt });
    onChanged();
  }

  async function deletePayer(payer: Payer) {
    const ok = await confirm({
      title: `Excluir ${payer.name} da lista?`,
      description:
        payer.monthsPaid > 0
          ? `Essa pessoa já tem ${payer.monthsPaid} pagamento(s) registrado(s) — excluir vai apagar esse histórico também.`
          : 'Essa ação não pode ser desfeita.',
      variant: 'danger',
    });
    if (!ok) return;
    await api.delete(`/ponta-firme/payers/${payer.id}`);
    onChanged();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl focus:outline-none flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
            <Dialog.Title className="font-display uppercase tracking-wider text-base text-text-main">
              Gerenciar integrantes
            </Dialog.Title>
            <Dialog.Close className="text-text-muted hover:text-text-main transition">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto p-4 flex flex-col gap-2">
            {payers.map((p) => (
              <div key={p.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={p.name} avatarUrl={p.avatarUrl} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-main truncate">
                      {p.name}
                      {p.removedAt && <span className="ml-1.5 text-[10px] text-red-500 font-normal">(removido)</span>}
                    </p>
                    {!p.isClaimed && <p className="text-[11px] text-text-muted">Sem cadastro real ainda</p>}
                  </div>
                  {!p.isClaimed && (
                    <button
                      onClick={() => setClaimingPayerId(claimingPayerId === p.id ? null : p.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition shrink-0"
                    >
                      <Link2 size={13} /> Atualizar usuário
                    </button>
                  )}
                  <button
                    onClick={() => toggleRemoved(p)}
                    title={p.removedAt ? 'Restaurar' : 'Marcar como removido'}
                    className="text-text-muted hover:text-amber-600 transition p-1 shrink-0"
                  >
                    {p.removedAt ? <RotateCcw size={15} /> : <UserX size={15} />}
                  </button>
                  <button
                    onClick={() => deletePayer(p)}
                    title="Excluir"
                    className="text-text-muted hover:text-red-600 transition p-1 shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {claimingPayerId === p.id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <UserPicker seasonId={seasonId} onPick={(u) => claimUser(p.id, u)} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border shrink-0">
            {!formOpen ? (
              <button
                onClick={openAddForm}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-2.5 transition"
              >
                <Plus size={16} /> Adicionar integrante
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-text-muted">Nome da pessoa</p>
                <PersonNameField
                  seasonId={seasonId}
                  pickedUser={pickedUser}
                  freeText={nameText}
                  onPick={(u) => {
                    setPickedUser(u);
                    setNameText(u.nickname || u.name);
                    setFormError(null);
                  }}
                  onTextChange={setNameText}
                  onClearPicked={() => {
                    setPickedUser(null);
                    setNameText('');
                  }}
                />

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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
