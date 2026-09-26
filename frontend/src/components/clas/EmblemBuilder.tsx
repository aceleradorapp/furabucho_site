import { Shuffle } from 'lucide-react';
import { ClanEmblem, type Emblema } from './ClanEmblem';

/**
 * Montador da bandeira. A pessoa escolhe peças prontas em vez de desenhar ou subir imagem —
 * é rápido, sai sempre bonito, e montar já é um momento de brincadeira por si só.
 */

export interface OpcoesEmblema {
  formas: string[];
  divisoes: string[];
  cores: string[];
  simbolos: string[];
}

const NOME_DA_FORMA: Record<string, string> = {
  escudo: 'Escudo',
  'escudo-redondo': 'Arredondado',
  brasao: 'Brasão',
  circulo: 'Círculo',
  losango: 'Losango',
  bandeira: 'Bandeira',
};

const NOME_DA_DIVISAO: Record<string, string> = {
  inteiro: 'Cor única',
  metade: 'Metade',
  quartos: 'Quartos',
  faixas: 'Faixas',
  chevron: 'Chevron',
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">{titulo}</p>
      {children}
    </div>
  );
}

export function EmblemBuilder({
  valor,
  opcoes,
  onChange,
}: {
  valor: Emblema;
  opcoes: OpcoesEmblema;
  onChange: (e: Emblema) => void;
}) {
  const set = (mudanca: Partial<Emblema>) => onChange({ ...valor, ...mudanca });

  function sortear() {
    const pega = <T,>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)];
    let cor2 = pega(opcoes.cores);
    const cor1 = pega(opcoes.cores);
    // Duas cores iguais fazem a divisão sumir — a bandeira fica parecendo quebrada.
    if (cor2 === cor1) cor2 = opcoes.cores[(opcoes.cores.indexOf(cor1) + 3) % opcoes.cores.length];
    onChange({
      shape: pega(opcoes.formas),
      division: pega(opcoes.divisoes),
      color1: cor1,
      color2: cor2,
      symbol: pega(opcoes.simbolos),
    });
  }

  return (
    <div className="flex flex-col sm:flex-row gap-5">
      {/* A prévia gruda no topo: mexendo nas peças, dá pra ver o resultado sem rolar a tela. */}
      <div className="sm:w-40 shrink-0 flex flex-col items-center gap-3 sm:sticky sm:top-20 self-start">
        <ClanEmblem emblema={valor} size={120} />
        <button
          type="button"
          onClick={sortear}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-primary transition"
        >
          <Shuffle size={13} /> Sortear
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-5 min-w-0">
        <Secao titulo="Formato">
          <div className="flex flex-wrap gap-2">
            {opcoes.formas.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => set({ shape: f })}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  valor.shape === f ? 'border-primary bg-primary/10 text-text-main' : 'border-border text-text-muted hover:border-primary/40'
                }`}
              >
                {NOME_DA_FORMA[f] ?? f}
              </button>
            ))}
          </div>
        </Secao>

        <Secao titulo="Divisão">
          <div className="flex flex-wrap gap-2">
            {opcoes.divisoes.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set({ division: d })}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  valor.division === d ? 'border-primary bg-primary/10 text-text-main' : 'border-border text-text-muted hover:border-primary/40'
                }`}
              >
                {NOME_DA_DIVISAO[d] ?? d}
              </button>
            ))}
          </div>
        </Secao>

        <div className="grid grid-cols-2 gap-5">
          {(['color1', 'color2'] as const).map((campo) => (
            <Secao key={campo} titulo={campo === 'color1' ? 'Cor principal' : 'Cor secundária'}>
              <div className="flex flex-wrap gap-1.5">
                {opcoes.cores.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set({ [campo]: c } as Partial<Emblema>)}
                    aria-label={`Cor ${c}`}
                    className={`w-8 h-8 rounded-lg border-2 transition ${
                      valor[campo] === c ? 'border-primary scale-110' : 'border-border/60 hover:border-primary/50'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Secao>
          ))}
        </div>

        <Secao titulo="Símbolo">
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-52 overflow-y-auto pr-1">
            {opcoes.simbolos.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ symbol: s })}
                aria-label={s}
                className={`aspect-square rounded-lg border p-1 transition ${
                  valor.symbol === s ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                }`}
              >
                <ClanEmblem
                  emblema={{ ...valor, symbol: s, shape: 'circulo', division: 'inteiro', color1: '#71717A', color2: '#71717A' }}
                  size={26}
                  className="mx-auto"
                />
              </button>
            ))}
          </div>
        </Secao>
      </div>
    </div>
  );
}
