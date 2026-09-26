import { Check, Search, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Caricatura } from './Caricatura';
import { nomeDe, type PessoaConvidavel } from './tipos';

/**
 * A tela só recarrega quando o modal FECHA, não a cada convite. Recarregar a cada clique
 * refazia três chamadas com o modal aberto e embaralhava o estado de quem já foi chamado.
 */
export function ConvidarModal({ clanId, onFechar }: { clanId: number; onFechar: () => void }) {
  const [pessoas, setPessoas] = useState<PessoaConvidavel[]>([]);
  const [busca, setBusca] = useState('');
  const [enviando, setEnviando] = useState<number | null>(null);
  const [convidados, setConvidados] = useState<Set<number>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<PessoaConvidavel[]>('/clas/pessoas').then(setPessoas);
  }, []);

  const q = busca.trim().toLowerCase();
  const filtradas = pessoas.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || (p.nickname ?? '').toLowerCase().includes(q),
  );
  // Quem já está em outro clã vai pro fim da lista em vez de sumir: assim dá pra entender
  // por que aquela pessoa não pode ser chamada, em vez de achar que ela não existe.
  const ordenadas = [...filtradas].sort((a, b) => Number(a.jaTemCla) - Number(b.jaTemCla));

  async function convidar(p: PessoaConvidavel) {
    setErro(null);
    setEnviando(p.id);
    try {
      await api.post(`/clas/${clanId}/convidar`, { userId: p.id });
      setConvidados((prev) => new Set(prev).add(p.id));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível convidar');
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative bg-card w-full sm:w-[94vw] sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="font-semibold text-text-main">Chamar pro clã</p>
          <button onClick={onFechar} className="text-text-muted hover:text-text-main transition" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-4 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pessoa..."
              className="w-full rounded-lg border border-border pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          {erro && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{erro}</p>}
        </div>

        <div className="px-5 py-4 overflow-y-auto flex flex-col gap-1">
          {ordenadas.map((p) => {
            const jaChamado = convidados.has(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 py-2">
                <Caricatura nome={nomeDe(p)} caricatureUrl={p.caricatureUrl} size={38} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-main truncate">{nomeDe(p)}</p>
                  {p.jaTemCla && <p className="text-xs text-text-muted">já tem clã</p>}
                  {!p.jaTemCla && p.semCaricatura && (
                    <p className="text-xs text-amber-700 dark:text-amber-500">sem caricatura — entra, mas fica inativo</p>
                  )}
                </div>
                {jaChamado ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 shrink-0">
                    <Check size={14} /> chamado
                  </span>
                ) : (
                  <button
                    onClick={() => convidar(p)}
                    disabled={p.jaTemCla || enviando === p.id}
                    // O nome no rótulo: quem usa leitor de tela ouviria só "Chamar, Chamar,
                    // Chamar" numa lista inteira de botões iguais.
                    aria-label={`Chamar ${nomeDe(p)}`}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-main hover:border-primary hover:text-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <UserPlus size={13} /> {enviando === p.id ? '...' : 'Chamar'}
                  </button>
                )}
              </div>
            );
          })}
          {ordenadas.length === 0 && <p className="text-sm text-text-muted py-4 text-center">Ninguém encontrado.</p>}
        </div>
      </div>
    </div>
  );
}
