import { Check, Flag, LogOut, ShieldPlus, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { Caricatura } from '../components/clas/Caricatura';
import { ClanEmblem } from '../components/clas/ClanEmblem';
import { ClanPatente, ProgressoPatente } from '../components/clas/ClanPatente';
import { ConvidarModal } from '../components/clas/ConvidarModal';
import { CriarClaModal } from '../components/clas/CriarClaModal';
import {
  emblemaDe, nomeDe, quando,
  type Cla, type Convite, type EventoDoMural, type MotivoRecusa,
} from '../components/clas/tipos';
import { useConfirm } from '../components/ConfirmDialogProvider';
import { PageLoader } from '../components/PageLoader';
import { PrivateLayout } from '../components/PrivateLayout';

interface Meu {
  cla: Cla | null;
  souLider: boolean;
  convites: Convite[];
  impedimento: string | null;
  temCaricatura: boolean;
}

export function ClasPage() {
  const confirm = useConfirm();
  const [meu, setMeu] = useState<Meu | null>(null);
  const [clas, setClas] = useState<Cla[]>([]);
  const [mural, setMural] = useState<EventoDoMural[]>([]);
  const [motivos, setMotivos] = useState<MotivoRecusa[]>([]);
  const [aba, setAba] = useState<'mural' | 'clas'>('mural');
  const [ordem, setOrdem] = useState<'ranking' | 'novos'>('ranking');
  const [criando, setCriando] = useState(false);
  const [convidando, setConvidando] = useState(false);
  const [recusando, setRecusando] = useState<Convite | null>(null);
  const [loading, setLoading] = useState(true);

  const pedidoAtual = useRef(0);

  const carregar = useCallback(async () => {
    const meuPedido = ++pedidoAtual.current;
    const [m, l, mu] = await Promise.all([
      api.get<Meu>('/clas/meu'),
      api.get<Cla[]>(`/clas?ordem=${ordem}`),
      api.get<EventoDoMural[]>('/clas/mural'),
    ]);

    // Descarta resposta atrasada. Sem isso, acontece o seguinte: a pessoa abre a página, e
    // antes das chamadas iniciais voltarem ela já criou o clã. A resposta velha ("você não
    // tem clã") chega depois da nova e desfaz a tela na cara dela.
    if (meuPedido !== pedidoAtual.current) return;

    setMeu(m);
    setClas(l);
    setMural(mu);
  }, [ordem]);

  useEffect(() => {
    carregar().finally(() => setLoading(false));
  }, [carregar]);

  useEffect(() => {
    api.get<{ motivosRecusa: MotivoRecusa[] }>('/clas/opcoes').then((d) => setMotivos(d.motivosRecusa));
  }, []);

  async function aceitar(c: Convite) {
    await api.post(`/clas/convites/${c.id}/aceitar`);
    await carregar();
  }

  async function recusar(codigo: string) {
    if (!recusando) return;
    await api.post(`/clas/convites/${recusando.id}/recusar`, { codigo });
    setRecusando(null);
    await carregar();
  }

  async function sair() {
    const certeza = await confirm({
      title: 'Sair do clã?',
      description: 'Depois de sair, você espera 7 dias pra entrar em outro.',
      variant: 'danger',
    });
    if (!certeza) return;
    await api.post('/clas/sair');
    await carregar();
  }

  async function assumir() {
    if (!meu?.cla) return;
    try {
      await api.post(`/clas/${meu.cla.id}/assumir`);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Não foi possível assumir');
    }
    await carregar();
  }

  if (loading) {
    return (
      <PrivateLayout>
        <PageLoader />
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main inline-flex items-center gap-2">
          <Flag size={22} className="text-primary" /> Clãs
        </h1>
        <p className="text-sm text-text-muted mt-1 mb-6">
          Junte a sua turma, monte a bandeira e faça o clã subir de patente.
        </p>

        {/* Convites primeiro: é a coisa que precisa de resposta, tem que vir antes de tudo. */}
        {meu?.convites.map((c) => (
          <div key={c.id} className="bg-primary/5 border border-primary/30 rounded-2xl p-4 mb-3">
            <div className="flex items-center gap-3 mb-3">
              <ClanEmblem emblema={emblemaDe(c.clan)} size={42} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-main">
                  <strong>{nomeDe(c.invitedBy)}</strong> te chamou pro clã
                </p>
                <p className="font-display uppercase tracking-wide text-text-main">{c.clan.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => aceitar(c)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-bold py-2.5 transition"
              >
                <Check size={15} /> Aceitar
              </button>
              <button
                onClick={() => setRecusando(c)}
                className="rounded-full border border-border px-4 py-2.5 text-sm text-text-muted hover:text-text-main transition"
              >
                Recusar
              </button>
            </div>
          </div>
        ))}

        {/* Meu clã, ou o convite pra criar um */}
        {meu?.cla ? (
          <MeuClaCard
            cla={meu.cla}
            souLider={meu.souLider}
            onConvidar={() => setConvidando(true)}
            onSair={sair}
            onAssumir={assumir}
          />
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5 mb-6 text-center">
            <ShieldPlus size={26} className="mx-auto text-primary mb-2" />
            <p className="font-semibold text-text-main mb-1">Você ainda não tem clã</p>
            <p className="text-sm text-text-muted mb-4">
              Crie o seu e chame a turma — ou espere alguém te chamar.
            </p>
            {meu?.impedimento ? (
              <p className="text-sm text-amber-700 dark:text-amber-500">{meu.impedimento}</p>
            ) : (
              <button
                onClick={() => setCriando(true)}
                className="rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-bold px-5 py-2.5 transition"
              >
                Criar meu clã
              </button>
            )}
            {!meu?.temCaricatura && (
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-3">
                Você ainda não tem caricatura. Dá pra entrar num clã, mas você só conta como ativo quando ela ficar pronta.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 bg-card-subtle rounded-full p-1 w-fit mb-5">
          {([['mural', 'Mural'], ['clas', 'Todos os clãs']] as const).map(([v, r]) => (
            <button
              key={v}
              onClick={() => setAba(v)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                aba === v ? 'bg-card shadow-sm text-text-main' : 'text-text-muted'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {aba === 'mural' ? (
          mural.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-10">
              Nada aconteceu ainda. Quando alguém criar um clã ou responder um convite, aparece aqui.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {mural.map((e) => (
                <div key={e.id} className="flex items-start gap-2.5 bg-card border border-border rounded-xl px-3 py-2.5">
                  {e.clan && (
                    <Link to={`/clas/${e.clan.id}`} className="shrink-0">
                      <ClanEmblem emblema={emblemaDe(e.clan)} size={26} />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-main leading-snug">{e.text}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {e.clan?.name} · {quando(e.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3 text-xs">
              <span className="text-text-muted">Ordenar:</span>
              {([['ranking', 'Em alta'], ['novos', 'Mais novos']] as const).map(([v, r]) => (
                <button
                  key={v}
                  onClick={() => setOrdem(v)}
                  className={`transition ${ordem === v ? 'text-primary font-semibold' : 'text-text-muted hover:text-text-main'}`}
                >
                  {r}
                </button>
              ))}
            </div>

            {clas.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-10">Nenhum clã foi criado ainda. Seja o primeiro.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {clas.map((c) => (
                  <Link
                    key={c.id}
                    to={`/clas/${c.id}`}
                    className="flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition"
                  >
                    {c.pontuacao ? (
                      <ClanPatente emblema={c.emblema} patente={c.pontuacao.patente} size={48} />
                    ) : (
                      <ClanEmblem emblema={c.emblema} size={48} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-display uppercase tracking-wide text-text-main truncate">{c.name}</p>
                      <p className="text-xs text-text-muted truncate">
                        {c.pontuacao?.patente.nome} · {c.totalMembros} {c.totalMembros === 1 ? 'membro' : 'membros'}
                        {!c.noRanking && ' · fora do ranking'}
                      </p>
                      {c.story && <p className="text-xs text-text-muted mt-1 line-clamp-2">{c.story}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {criando && (
        <CriarClaModal
          onFechar={() => setCriando(false)}
          onCriado={() => {
            setCriando(false);
            carregar();
          }}
        />
      )}
      {convidando && meu?.cla && (
        <ConvidarModal
          clanId={meu.cla.id}
          onFechar={() => {
            setConvidando(false);
            carregar();
          }}
        />
      )}
      {recusando && (
        <RecusarModal motivos={motivos} nomeDoCla={recusando.clan.name} onFechar={() => setRecusando(null)} onEscolher={recusar} />
      )}
    </PrivateLayout>
  );
}

function MeuClaCard({
  cla, souLider, onConvidar, onSair, onAssumir,
}: {
  cla: Cla;
  souLider: boolean;
  onConvidar: () => void;
  onSair: () => void;
  onAssumir: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-start gap-4">
        {cla.pontuacao && <ClanPatente emblema={cla.emblema} patente={cla.pontuacao.patente} size={64} mostrarNome />}
        <div className="flex-1 min-w-0">
          <Link to={`/clas/${cla.id}`} className="font-display uppercase tracking-wide text-lg text-text-main hover:text-primary transition">
            {cla.name}
          </Link>
          {cla.story && <p className="text-sm text-text-muted mt-1">{cla.story}</p>}
          {cla.semLider && (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <p className="text-xs text-amber-800 dark:text-amber-400 mb-2">
                O clã está sem líder. Alguém precisa assumir.
              </p>
              <button onClick={onAssumir} className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-full px-3 py-1.5 transition">
                Assumir o clã
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {cla.membros.map((m) => (
          <Caricatura key={m.id} nome={nomeDe(m)} caricatureUrl={m.caricatureUrl} size={40} />
        ))}
      </div>

      {cla.pontuacao && (
        <div className="mt-4">
          <ProgressoPatente patente={cla.pontuacao.patente} />
          <p className="text-xs text-text-muted mt-2">
            {cla.pontuacao.ativosRecentes} de {cla.pontuacao.totalMembros} apareceram no último mês
            {cla.pontuacao.multiplicador >= 1.2 && ' — clã inteiro na ativa, pontuação no máximo!'}
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        {souLider && (
          <button
            onClick={onConvidar}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2 transition"
          >
            <UserPlus size={15} /> Chamar alguém
          </button>
        )}
        <button
          onClick={onSair}
          className="inline-flex items-center gap-1.5 rounded-full text-sm text-text-muted hover:text-red-600 px-3 py-2 transition"
        >
          <LogOut size={15} /> Sair do clã
        </button>
      </div>
    </div>
  );
}

function RecusarModal({
  motivos, nomeDoCla, onFechar, onEscolher,
}: {
  motivos: MotivoRecusa[];
  nomeDoCla: string;
  onFechar: () => void;
  onEscolher: (codigo: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative bg-card w-full sm:w-[94vw] sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="font-semibold text-text-main">Recusar o {nomeDoCla}</p>
          <button onClick={onFechar} className="text-text-muted hover:text-text-main transition" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <p className="px-5 pt-3 text-sm text-text-muted">Escolha a desculpa. Ela vai aparecer no mural.</p>
        <div className="px-5 py-3 overflow-y-auto flex flex-col gap-1.5">
          {motivos.map((m) => (
            <button
              key={m.codigo}
              onClick={() => onEscolher(m.codigo)}
              className="text-left rounded-lg border border-border px-3 py-2.5 text-sm text-text-main hover:border-primary hover:bg-primary/5 transition"
            >
              {m.texto}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
