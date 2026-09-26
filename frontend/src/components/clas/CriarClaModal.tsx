import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { Emblema } from './ClanEmblem';
import { EmblemBuilder, type OpcoesEmblema } from './EmblemBuilder';

const PADRAO: Emblema = {
  shape: 'escudo',
  division: 'metade',
  color1: '#FF5E14',
  color2: '#1C1C1F',
  symbol: 'crown',
};

export function CriarClaModal({ onFechar, onCriado }: { onFechar: () => void; onCriado: () => void }) {
  const [opcoes, setOpcoes] = useState<OpcoesEmblema | null>(null);
  const [nome, setNome] = useState('');
  const [historia, setHistoria] = useState('');
  const [emblema, setEmblema] = useState<Emblema>(PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ emblema: OpcoesEmblema }>('/clas/opcoes').then((d) => setOpcoes(d.emblema));
  }, []);

  async function criar() {
    setErro(null);
    if (nome.trim().length < 3) return setErro('O nome precisa ter pelo menos 3 letras');

    setSalvando(true);
    try {
      await api.post('/clas', {
        name: nome.trim(),
        story: historia.trim() || null,
        emblemShape: emblema.shape,
        emblemDivision: emblema.division,
        emblemColor1: emblema.color1,
        emblemColor2: emblema.color2,
        emblemSymbol: emblema.symbol,
      });
      onCriado();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar o clã');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative bg-card w-full sm:w-[94vw] sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="font-semibold text-text-main">Criar meu clã</p>
          <button onClick={onFechar} className="text-text-muted hover:text-text-main transition" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex flex-col gap-5">
          <div>
            <label className="text-sm text-text-muted" htmlFor="nomeCla">
              Nome do clã
            </label>
            <input
              id="nomeCla"
              value={nome}
              onChange={(e) => setNome(e.target.value.slice(0, 30))}
              placeholder="Os Fura-Bucho do Norte"
              autoFocus
              className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 outline-none focus:border-primary"
            />
            <p className="text-xs text-text-muted text-right mt-1">{nome.length}/30</p>
          </div>

          <div>
            <label className="text-sm text-text-muted" htmlFor="historiaCla">
              A história do clã <span className="text-text-muted/70">(opcional)</span>
            </label>
            <textarea
              id="historiaCla"
              value={historia}
              onChange={(e) => setHistoria(e.target.value)}
              rows={3}
              placeholder="A turma do chopp e do barulho. Fundada numa mesa de bar em 1998..."
              className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary resize-none"
            />
            <p className="text-xs text-text-muted mt-1">Pode inventar. Quanto mais sem-vergonhice, melhor.</p>
          </div>

          <div>
            <p className="text-sm text-text-muted mb-3">A bandeira</p>
            {opcoes ? (
              <EmblemBuilder valor={emblema} opcoes={opcoes} onChange={setEmblema} />
            ) : (
              <p className="text-sm text-text-muted">Carregando as peças...</p>
            )}
          </div>

          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 shrink-0">
          <button onClick={onFechar} className="rounded-full px-4 py-2.5 text-sm text-text-muted hover:text-text-main transition">
            Cancelar
          </button>
          <button
            onClick={criar}
            disabled={salvando || !opcoes}
            className="rounded-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 transition"
          >
            {salvando ? 'Criando...' : 'Fundar o clã'}
          </button>
        </div>
      </div>
    </div>
  );
}
