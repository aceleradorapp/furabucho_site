import { Mail, MailOpen, PenLine, Send, Trash2, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { Avatar } from '../components/Avatar';
import { useConfirm } from '../components/ConfirmDialogProvider';
import { PageLoader } from '../components/PageLoader';
import { PrivateLayout } from '../components/PrivateLayout';

const TAMANHO_MAXIMO = 500;

interface Pessoa {
  id: number;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
}

interface Recado {
  id: number;
  message: string;
  lido: boolean;
  createdAt: string;
  de: Pessoa;
}

interface Cota {
  limite: number;
  usados: number;
  restantes: number;
}

interface Enviado {
  batchId: string;
  message: string;
  createdAt: string;
  para: Pessoa[];
}

function nomeDe(p: Pessoa) {
  return p.nickname || p.name;
}

function quando(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function BilhetinhosPage() {
  const confirm = useConfirm();
  const [aba, setAba] = useState<'recebidos' | 'enviados'>('recebidos');
  const [recados, setRecados] = useState<Recado[]>([]);
  const [enviados, setEnviados] = useState<Enviado[]>([]);
  const [cota, setCota] = useState<Cota | null>(null);
  const [loading, setLoading] = useState(true);
  const [escrevendo, setEscrevendo] = useState(false);

  async function carregar() {
    const data = await api.get<{ naoLidos: number; cota: Cota; recados: Recado[] }>('/recados');
    setRecados(data.recados);
    setCota(data.cota);
  }

  async function carregarEnviados() {
    setEnviados(await api.get<Enviado[]>('/recados/enviados'));
  }

  useEffect(() => {
    carregar().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (aba === 'enviados') carregarEnviados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  async function marcarLido(r: Recado) {
    if (r.lido) return;
    setRecados((prev) => prev.map((x) => (x.id === r.id ? { ...x, lido: true } : x)));
    await api.post(`/recados/${r.id}/read`).catch(() => carregar());
  }

  async function apagar(r: Recado) {
    if (!(await confirm({ title: 'Apagar este bilhetinho?', variant: 'danger' }))) return;
    await api.delete(`/recados/${r.id}`);
    setRecados((prev) => prev.filter((x) => x.id !== r.id));
  }

  return (
    <PrivateLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h1 className="font-display uppercase tracking-wider text-2xl text-text-main inline-flex items-center gap-2">
              <Mail size={22} className="text-primary" /> Bilhetinhos
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Mande um recado pra turma, igual bilhete de sala de aula — só que agora todo mundo sabe quem mandou.
            </p>
          </div>
        </div>

        {cota && cota.limite > 0 && (
          <p className="text-xs text-text-muted mb-4">
            Você ainda pode enviar <strong className="text-text-main">{cota.restantes}</strong> de {cota.limite} hoje.
          </p>
        )}

        <div className="flex items-center gap-1 bg-card-subtle rounded-full p-1 w-fit mb-5">
          {(['recebidos', 'enviados'] as const).map((valor) => (
            <button
              key={valor}
              onClick={() => setAba(valor)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition capitalize ${
                aba === valor ? 'bg-card shadow-sm text-text-main' : 'text-text-muted'
              }`}
            >
              {valor}
            </button>
          ))}
        </div>

        {loading ? (
          <PageLoader />
        ) : aba === 'recebidos' ? (
          recados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted text-center">
              <MailOpen size={32} className="text-border" />
              <p className="text-sm">Nenhum bilhetinho ainda.</p>
              <p className="text-xs">Que tal ser você a mandar o primeiro?</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recados.map((r) => (
                <div
                  key={r.id}
                  onClick={() => marcarLido(r)}
                  className={`bg-card border rounded-2xl p-4 transition cursor-default ${
                    r.lido ? 'border-border' : 'border-primary/40 bg-primary/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <Avatar name={nomeDe(r.de)} avatarUrl={r.de.avatarUrl} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-main truncate">{nomeDe(r.de)}</p>
                      <p className="text-xs text-text-muted">{quando(r.createdAt)}</p>
                    </div>
                    {!r.lido && <span className="text-[10px] font-bold text-primary uppercase">novo</span>}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        apagar(r);
                      }}
                      className="text-text-muted/60 hover:text-red-600 transition p-1"
                      aria-label="Apagar bilhetinho"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="text-sm text-text-main whitespace-pre-wrap break-words">{r.message}</p>
                </div>
              ))}
            </div>
          )
        ) : enviados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted text-center">
            <Send size={30} className="text-border" />
            <p className="text-sm">Você ainda não mandou nenhum bilhetinho.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {enviados.map((e) => (
              <div key={e.batchId} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Users size={14} className="text-text-muted shrink-0" />
                  <span className="text-xs text-text-muted">
                    para {e.para.map(nomeDe).join(', ')}
                  </span>
                  <span className="text-xs text-text-muted ml-auto">{quando(e.createdAt)}</span>
                </div>
                <p className="text-sm text-text-main whitespace-pre-wrap break-words">{e.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra de ação fixa. No celular ela fica logo acima da navegação de baixo, que tem
          4.25rem de altura; no desktop encosta no rodapé, porque lá não existe essa barra. */}
      {cota && cota.limite > 0 && (
        <div className="fixed bottom-[4.25rem] md:bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
          <div className="max-w-2xl mx-auto px-4 py-3 flex justify-end">
            <button
              onClick={() => setEscrevendo(true)}
              disabled={cota.restantes <= 0}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-full transition"
            >
              <PenLine size={16} />
              {cota.restantes > 0 ? 'Escrever bilhetinho' : 'Limite de hoje atingido'}
            </button>
          </div>
        </div>
      )}

      {escrevendo && (
        <ModalEscrever
          onFechar={() => setEscrevendo(false)}
          onEnviado={async () => {
            setEscrevendo(false);
            await carregar();
            if (aba === 'enviados') await carregarEnviados();
          }}
        />
      )}
    </PrivateLayout>
  );
}

function ModalEscrever({ onFechar, onEnviado }: { onFechar: () => void; onEnviado: () => void }) {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [busca, setBusca] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<Pessoa[]>('/recados/destinatarios').then(setPessoas);
  }, []);

  const filtradas = pessoas.filter((p) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.nickname ?? '').toLowerCase().includes(q);
  });

  function alternar(id: number) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function enviar() {
    setErro(null);
    if (selecionados.size === 0) return setErro('Escolha pelo menos uma pessoa');
    if (!texto.trim()) return setErro('Escreva o recado');

    setEnviando(true);
    try {
      await api.post('/recados', { toUserIds: Array.from(selecionados), message: texto.trim() });
      onEnviado();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível enviar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative bg-card w-full sm:w-[94vw] sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="font-semibold text-text-main">Novo bilhetinho</p>
          <button onClick={onFechar} className="text-text-muted hover:text-text-main transition" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex flex-col gap-4">
          <div>
            <p className="text-sm text-text-muted mb-2">
              Para quem? {selecionados.size > 0 && <strong className="text-text-main">({selecionados.size})</strong>}
            </p>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pessoa..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary mb-2"
            />
            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto">
              {filtradas.map((p) => {
                const ativo = selecionados.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => alternar(p.id)}
                    className={`inline-flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition ${
                      ativo ? 'border-primary bg-primary/10 text-text-main' : 'border-border text-text-muted hover:border-primary/40'
                    }`}
                  >
                    <Avatar name={nomeDe(p)} avatarUrl={p.avatarUrl} size={24} />
                    <span className="text-sm">{nomeDe(p)}</span>
                  </button>
                );
              })}
              {filtradas.length === 0 && <p className="text-sm text-text-muted py-2">Ninguém encontrado.</p>}
            </div>
          </div>

          <div>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, TAMANHO_MAXIMO))}
              rows={4}
              placeholder="Escreva seu recado..."
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary resize-none"
            />
            <p className="text-xs text-text-muted text-right mt-1">
              {texto.length}/{TAMANHO_MAXIMO}
            </p>
          </div>

          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end shrink-0">
          <button
            onClick={enviar}
            disabled={enviando}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 rounded-full transition"
          >
            <Send size={15} /> {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
