import { ArrowLeft, Crown, Eye, EyeOff, ShieldAlert, Trash2, UserMinus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Caricatura } from '../components/clas/Caricatura';
import { ClanPatente, ProgressoPatente } from '../components/clas/ClanPatente';
import { nomeDe, quando, type Cla, type EventoDoMural } from '../components/clas/tipos';
import { useConfirm } from '../components/ConfirmDialogProvider';
import { PageLoader } from '../components/PageLoader';
import { PrivateLayout } from '../components/PrivateLayout';

type Detalhe = Cla & { eventos: EventoDoMural[] };

/**
 * Só aparece pra quem administra. Fica no fim da página de propósito: é ferramenta de
 * manutenção, não parte da brincadeira.
 */
function PainelDoAdmin({ cla, onMudou }: { cla: Detalhe; onMudou: () => Promise<void> }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);

  const souAdmin = user?.role === 'admin';
  const posso = souAdmin || !!user?.permissions['announcements.manage'];
  if (!posso) return null;

  async function publicar() {
    if (!texto.trim()) return;
    setOcupado(true);
    setRecado(null);
    try {
      await api.post(`/clas/${cla.id}/publicar`, { texto: texto.trim() });
      setTexto('');
      setRecado('Publicado no feed.');
      await onMudou();
    } catch (e) {
      setRecado(e instanceof ApiError ? e.message : 'Não foi possível publicar');
    } finally {
      setOcupado(false);
    }
  }

  async function alternarHistoria() {
    const bloquear = !cla.storyBlocked;
    if (bloquear && !(await confirm({ title: 'Tirar a história do ar?', description: 'O líder é avisado e pode escrever outra.', variant: 'danger' }))) return;
    setOcupado(true);
    try {
      await api.patch(`/clas/${cla.id}/historia`, { bloquear });
      await onMudou();
    } finally {
      setOcupado(false);
    }
  }

  async function dissolver() {
    const certeza = await confirm({
      title: `Dissolver o ${cla.name}?`,
      description: 'Todo mundo sai do clã e ele some da lista. Não tem como desfazer.',
      variant: 'danger',
    });
    if (!certeza) return;
    await api.delete(`/clas/${cla.id}`);
    navigate('/clas');
  }

  return (
    <section className="mt-7 border border-dashed border-border rounded-2xl p-4">
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
        <ShieldAlert size={13} /> Administração
      </p>

      <label className="block text-sm text-text-muted" htmlFor="textoCla">
        Escrever sobre este clã
      </label>
      <textarea
        id="textoCla"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder="O Turma do Chopp não perde uma desde março..."
        className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary resize-none"
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={publicar}
          disabled={ocupado || !texto.trim()}
          className="rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-bold px-4 py-2 transition"
        >
          {ocupado ? '...' : 'Publicar no feed'}
        </button>
        {recado && <span className="text-xs text-text-muted">{recado}</span>}
      </div>

      {souAdmin && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
          {cla.story !== null || cla.storyBlocked ? (
            <button
              onClick={alternarHistoria}
              disabled={ocupado}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs text-text-muted hover:text-text-main transition"
            >
              {cla.storyBlocked ? <Eye size={13} /> : <EyeOff size={13} />}
              {cla.storyBlocked ? 'Devolver a história' : 'Tirar a história do ar'}
            </button>
          ) : null}
          <button
            onClick={dissolver}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs text-text-muted hover:text-red-600 hover:border-red-300 transition"
          >
            <Trash2 size={13} /> Dissolver o clã
          </button>
        </div>
      )}
    </section>
  );
}

export function ClaDetalhePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [cla, setCla] = useState<Detalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [naoAchou, setNaoAchou] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setCla(await api.get<Detalhe>(`/clas/${id}`));
    } catch {
      setNaoAchou(true);
    }
  }, [id]);

  useEffect(() => {
    carregar().finally(() => setLoading(false));
  }, [carregar]);

  async function remover(membroId: number, nome: string) {
    const certeza = await confirm({ title: `Tirar ${nome} do clã?`, variant: 'danger' });
    if (!certeza) return;
    await api.post(`/clas/${id}/remover`, { userId: membroId });
    await carregar();
  }

  if (loading) {
    return (
      <PrivateLayout>
        <PageLoader />
      </PrivateLayout>
    );
  }

  if (naoAchou || !cla) {
    return (
      <PrivateLayout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-text-muted mb-4">Esse clã não existe mais.</p>
          <Link to="/clas" className="text-primary text-sm font-semibold">
            Voltar pros clãs
          </Link>
        </div>
      </PrivateLayout>
    );
  }

  const souLider = cla.leaderId === user?.id;

  return (
    <PrivateLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <Link to="/clas" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-main transition mb-5">
          <ArrowLeft size={15} /> Clãs
        </Link>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-start gap-4">
            {cla.pontuacao && <ClanPatente emblema={cla.emblema} patente={cla.pontuacao.patente} size={80} mostrarNome />}
            <div className="flex-1 min-w-0">
              <h1 className="font-display uppercase tracking-wide text-xl text-text-main">{cla.name}</h1>
              {cla.leader && (
                <p className="text-xs text-text-muted inline-flex items-center gap-1 mt-1">
                  <Crown size={12} className="text-primary" /> {nomeDe(cla.leader)}
                </p>
              )}
              {cla.semLider && <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">Sem líder no momento</p>}
              {cla.story && <p className="text-sm text-text-muted mt-3 whitespace-pre-wrap">{cla.story}</p>}
              {cla.storyBlocked && (
                <p className="text-xs text-text-muted italic mt-3">A história deste clã foi retirada.</p>
              )}
            </div>
          </div>

          {cla.pontuacao && (
            <div className="mt-5 pt-4 border-t border-border">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { valor: cla.pontuacao.reputacao, rotulo: 'reputação' },
                  { valor: cla.pontuacao.folego, rotulo: 'últimos 30 dias' },
                  { valor: `${cla.pontuacao.ativosRecentes}/${cla.pontuacao.totalMembros}`, rotulo: 'na ativa' },
                ].map((n) => (
                  <div key={n.rotulo} className="bg-card-subtle rounded-xl px-2 py-2.5 text-center">
                    <p className="text-lg font-bold text-text-main leading-none tabular-nums">{n.valor}</p>
                    <p className="text-[10px] text-text-muted mt-1 leading-tight">{n.rotulo}</p>
                  </div>
                ))}
              </div>
              <ProgressoPatente patente={cla.pontuacao.patente} />
              {!cla.noRanking && (
                <p className="text-xs text-text-muted mt-2">
                  Fora do ranking: precisa de 3 membros com caricatura.
                </p>
              )}
            </div>
          )}
        </div>

        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mt-6 mb-3">
          A turma ({cla.totalMembros})
        </h2>
        <div className="flex flex-wrap gap-3">
          {cla.membros.map((m) => (
            <div key={m.id} className="relative">
              <Caricatura nome={nomeDe(m)} caricatureUrl={m.caricatureUrl} size={56} mostrarNome />
              {m.id === cla.leaderId && (
                <Crown size={13} className="absolute -top-1 -right-0.5 text-primary fill-primary/30" />
              )}
              {souLider && m.id !== user?.id && (
                <button
                  onClick={() => remover(m.id, nomeDe(m))}
                  className="absolute -top-1 -left-1 bg-card border border-border rounded-full p-0.5 text-text-muted hover:text-red-600 transition"
                  aria-label={`Tirar ${nomeDe(m)} do clã`}
                  title={`Tirar ${nomeDe(m)} do clã`}
                >
                  <UserMinus size={11} />
                </button>
              )}
            </div>
          ))}
        </div>

        <PainelDoAdmin cla={cla} onMudou={carregar} />

        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mt-7 mb-3">A história do clã</h2>
        {cla.eventos.length === 0 ? (
          <p className="text-sm text-text-muted">Nada aconteceu ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {cla.eventos.map((e) => (
              <div key={e.id} className="bg-card border border-border rounded-xl px-3 py-2.5">
                <p className="text-sm text-text-main leading-snug">{e.text}</p>
                <p className="text-xs text-text-muted mt-0.5">{quando(e.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PrivateLayout>
  );
}
