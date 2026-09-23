import { Check, Mail, Phone, Rocket, Send, Star, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../../components/Avatar';
import { useConfirm } from '../../components/ConfirmDialogProvider';
import { PrivateLayout } from '../../components/PrivateLayout';
import { UPLOADS_BASE } from '../../lib/config';
import { formatPhoneBR } from '../../lib/phoneMask';

interface Role {
  id: number;
  key: string;
  label: string;
}

interface PioneiroRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  points: number;
  status: string;
  createdAt: string;
  convertedUser: { id: number; name: string; username: string } | null;
}

interface DraftRow {
  pioneiroId: number;
  name: string;
  username: string;
  email: string;
  whatsapp: string;
  roleId: number | '';
  password: string;
}

interface ConvertResult {
  pioneiroId: number;
  ok: boolean;
  user?: { id: number; username: string };
  tempPassword?: string;
  keptOwnPassword?: boolean;
  error?: string;
}

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, '')
    .replace(/\s+/g, '.')
    .replace(/\.{2,}/g, '.');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function AdminPioneiroConversionPage() {
  const { user: authUser } = useAuth();
  const confirm = useConfirm();
  const canChangeRole = authUser?.permissions['members.changeRole'] ?? false;

  const [pioneiros, setPioneiros] = useState<PioneiroRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reviewMode, setReviewMode] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<ConvertResult[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    const data = await api.get<PioneiroRow[]>('/admin/pioneiro-conversao');
    setPioneiros(data);
    if (canChangeRole) {
      const r = await api.get<Role[]>('/admin/users/roles');
      setRoles(r);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = useMemo(() => pioneiros.filter((p) => !p.convertedUser), [pioneiros]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(pioneiro: PioneiroRow) {
    const ok = await confirm({
      title: `Excluir pré-cadastro de ${pioneiro.name}?`,
      description: pioneiro.convertedUser
        ? `Isso remove só o pré-cadastro de Pioneiro (fotos, comentários e pontos ganhos nessa fase). A conta de membro dela, @${pioneiro.convertedUser.username}, não é afetada.`
        : 'Isso remove o pré-cadastro, os pontos ganhos, fotos e comentários enviados como Pioneiro. Essa ação não pode ser desfeita.',
      variant: 'danger',
    });
    if (!ok) return;
    await api.delete(`/admin/pioneiro-conversao/${pioneiro.id}`);
    setPioneiros((prev) => prev.filter((p) => p.id !== pioneiro.id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(pioneiro.id);
      return next;
    });
  }

  function startReview() {
    const membroRole = roles.find((r) => r.key === 'membro');
    const defaultRoleId = membroRole?.id ?? roles[0]?.id ?? '';
    const rows = Array.from(selected)
      .map((id) => pending.find((p) => p.id === id))
      .filter((p): p is PioneiroRow => !!p)
      .map((p) => ({
        pioneiroId: p.id,
        name: p.name,
        username: slugify(p.name),
        email: p.email ?? '',
        whatsapp: formatPhoneBR(p.phone ?? ''),
        roleId: canChangeRole ? defaultRoleId : ('' as number | ''),
        password: '',
      }));
    setDrafts(rows);
    setResults([]);
    setReviewMode(true);
  }

  function updateDraft(pioneiroId: number, patch: Partial<DraftRow>) {
    setDrafts((prev) => prev.map((d) => (d.pioneiroId === pioneiroId ? { ...d, ...patch } : d)));
  }

  function draftError(d: DraftRow): string | null {
    if (!d.name.trim()) return 'Preencha o nome';
    if (!d.username.trim()) return 'Preencha o usuário';
    if (!d.email.trim() && !d.whatsapp.trim()) return 'Informe e-mail ou WhatsApp';
    return null;
  }

  const hasBlockingError = drafts.some((d) => draftError(d));

  async function handleConfirm() {
    setSending(true);
    setLoadError(null);
    try {
      const items = drafts.map((d) => ({
        pioneiroId: d.pioneiroId,
        name: d.name.trim(),
        username: d.username.trim(),
        email: d.email.trim() || undefined,
        whatsapp: d.whatsapp.trim() || undefined,
        roleId: d.roleId || undefined,
        password: d.password.trim() || undefined,
      }));
      const { results: res } = await api.post<{ results: ConvertResult[] }>('/admin/pioneiro-conversao/convert', {
        items,
      });
      setResults(res);

      const succeededIds = new Set(res.filter((r) => r.ok).map((r) => r.pioneiroId));
      setDrafts((prev) => prev.filter((d) => !succeededIds.has(d.pioneiroId)));
      setSelected((prev) => {
        const next = new Set(prev);
        succeededIds.forEach((id) => next.delete(id));
        return next;
      });
      await load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Não foi possível enviar');
    } finally {
      setSending(false);
    }
  }

  function closeReview() {
    setReviewMode(false);
    setDrafts([]);
    setResults([]);
    setSelected(new Set());
  }

  return (
    <PrivateLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 pb-28">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2 inline-flex items-center gap-2">
          <Rocket size={22} className="text-primary" /> Pioneiros → Membros
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Envie quem se pré-cadastrou no Programa Pioneiros pro cadastro real de membros. A pontuação e o histórico do
          pioneiro continuam intactos — só marcamos que essa pessoa já virou membro.
        </p>

        {results.length > 0 && (
          <div className="bg-card-subtle rounded-xl p-4 mb-4 text-sm flex flex-col gap-2">
            <p className="text-text-main font-medium">Resultado do envio:</p>
            {results.map((r) => {
              const pioneiro = pioneiros.find((p) => p.id === r.pioneiroId);
              return (
                <div key={r.pioneiroId} className="flex items-center gap-2">
                  {r.ok ? <Check size={14} className="text-green-600 shrink-0" /> : <X size={14} className="text-red-600 dark:text-red-400 shrink-0" />}
                  <span className="text-text-main">{pioneiro?.name ?? `#${r.pioneiroId}`}</span>
                  {r.ok ? (
                    <span className="text-text-muted">
                      cadastrado como <strong>{r.user?.username}</strong>{' '}
                      {r.keptOwnPassword ? (
                        '· continua com a mesma senha que ele já usava'
                      ) : (
                        <>
                          · senha temporária:{' '}
                          <span className="font-mono bg-card border border-border rounded px-1.5 py-0.5">
                            {r.tempPassword}
                          </span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">{r.error}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {loadError && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{loadError}</p>}

        {reviewMode ? (
          <div className="flex flex-col gap-4">
            {drafts.length === 0 ? (
              <p className="text-sm text-text-muted py-6 text-center">Tudo enviado por aqui.</p>
            ) : (
              drafts.map((d) => {
                const pioneiro = pioneiros.find((p) => p.id === d.pioneiroId);
                const error = draftError(d);
                return (
                  <div key={d.pioneiroId} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={d.name || '?'}
                        avatarUrl={pioneiro?.avatarUrl ? `${UPLOADS_BASE}${pioneiro.avatarUrl}` : null}
                        size={32}
                      />
                      <p className="text-sm font-semibold text-text-main">{pioneiro?.name}</p>
                      <span className="text-xs text-text-muted inline-flex items-center gap-1 ml-auto">
                        <Star size={12} className="text-amber-500" /> {pioneiro?.points.toFixed(1)} pts
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-text-muted">Nome</label>
                        <input
                          value={d.name}
                          onChange={(e) => updateDraft(d.pioneiroId, { name: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted">Usuário (login)</label>
                        <input
                          value={d.username}
                          onChange={(e) => updateDraft(d.pioneiroId, { username: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted">E-mail (ou WhatsApp)</label>
                        <input
                          type="email"
                          value={d.email}
                          onChange={(e) => updateDraft(d.pioneiroId, { email: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted">WhatsApp</label>
                        <input
                          type="tel"
                          value={d.whatsapp}
                          onChange={(e) => updateDraft(d.pioneiroId, { whatsapp: formatPhoneBR(e.target.value) })}
                          placeholder="(19)997230475"
                          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      {canChangeRole && (
                        <div>
                          <label className="text-xs text-text-muted">Papel</label>
                          <select
                            value={d.roleId}
                            onChange={(e) => updateDraft(d.pioneiroId, { roleId: Number(e.target.value) })}
                            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-text-muted">Definir senha manualmente (opcional)</label>
                        <input
                          value={d.password}
                          onChange={(e) => updateDraft(d.pioneiroId, { password: e.target.value })}
                          placeholder="Deixe em branco para manter a senha dele"
                          minLength={6}
                          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
                  </div>
                );
              })
            )}

            <div className="flex items-center gap-2 sticky bottom-4">
              <button
                onClick={handleConfirm}
                disabled={sending || drafts.length === 0 || hasBlockingError}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 transition"
              >
                <Send size={15} /> {sending ? 'Enviando...' : `Confirmar envio de ${drafts.length} pessoa(s)`}
              </button>
              <button
                onClick={closeReview}
                className="rounded-full border border-border text-text-muted text-sm px-4 py-2.5 transition"
              >
                {drafts.length === 0 ? 'Fechar' : 'Cancelar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pioneiros.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted">
                <UserPlus size={32} className="text-border" />
                <p className="text-sm">Nenhum pré-cadastro de Pioneiro ainda.</p>
              </div>
            ) : (
              pioneiros.map((p) => {
                const isSelected = selected.has(p.id);
                const isConverted = !!p.convertedUser;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 bg-card border rounded-2xl p-4 transition ${
                      isConverted ? 'opacity-60 grayscale' : isSelected ? 'border-primary ring-1 ring-primary' : 'border-border'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => !isConverted && toggle(p.id)}
                      disabled={isConverted}
                      title={isConverted ? 'Já enviado pro cadastro de membros' : undefined}
                      className={`flex items-center gap-3 text-left flex-1 min-w-0 ${isConverted ? 'cursor-default' : ''}`}
                    >
                      {isConverted ? (
                        <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400">
                          <Check size={13} strokeWidth={3} />
                        </div>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                            isSelected ? 'bg-primary border-primary' : 'border-border'
                          }`}
                        >
                          {isSelected && <Check size={13} className="text-white" strokeWidth={3} />}
                        </div>
                      )}
                      <Avatar name={p.name} avatarUrl={p.avatarUrl ? `${UPLOADS_BASE}${p.avatarUrl}` : null} size={38} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-text-main truncate">{p.name}</p>
                          {isConverted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 rounded-full px-2 py-0.5 shrink-0">
                              Enviado
                            </span>
                          )}
                        </div>
                        {isConverted ? (
                          <p className="text-xs text-text-muted">
                            já é membro como <strong>@{p.convertedUser?.username}</strong>
                          </p>
                        ) : (
                          <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                            {p.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail size={11} /> {p.email}
                              </span>
                            )}
                            {p.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone size={11} /> {p.phone}
                              </span>
                            )}
                            <span>desde {formatDate(p.createdAt)}</span>
                          </div>
                        )}
                      </div>
                    </button>
                    <span className="text-xs font-semibold text-amber-600 inline-flex items-center gap-1 shrink-0">
                      <Star size={12} /> {p.points.toFixed(1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      className="text-text-muted hover:text-red-600 transition p-1.5 shrink-0"
                      aria-label="Excluir pré-cadastro"
                      title="Excluir pré-cadastro"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {!reviewMode && selected.size > 0 && (
        <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-text-muted">{selected.size} selecionado(s)</p>
            <button
              onClick={startReview}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2 transition"
            >
              <Send size={15} /> Revisar e enviar
            </button>
          </div>
        </div>
      )}
    </PrivateLayout>
  );
}
