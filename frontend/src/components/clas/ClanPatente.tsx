import { ClanEmblem, type Emblema } from './ClanEmblem';

/**
 * A bandeira com a moldura da patente em volta.
 *
 * A moldura é gerada, não é imagem baixada: sem problema de licença e sem arquivo pra
 * hospedar. Ela sobe em três degraus de metal (bronze, prata, ouro) e ganha estrelas
 * dentro de cada degrau — assim dá pra ler o nível de longe, mesmo pequena.
 */

export interface Patente {
  nivel: number;
  nome: string;
  proxima: { nome: string; faltam: number } | null;
  progresso: number;
}

const METAIS = [
  { ate: 1, anel: null, brilho: 'none' },                                // nível 1: sem moldura
  { ate: 2, anel: '#71717A', brilho: 'none' },                           // ferro
  { ate: 4, anel: '#B45309', brilho: '0 0 6px rgba(180,83,9,.5)' },      // bronze
  { ate: 6, anel: '#94A3B8', brilho: '0 0 8px rgba(148,163,184,.55)' },  // prata
  { ate: 8, anel: '#EAB308', brilho: '0 0 12px rgba(234,179,8,.6)' },    // ouro
];

function metalDo(nivel: number) {
  return METAIS.find((m) => nivel <= m.ate) ?? METAIS[METAIS.length - 1];
}

/** Estrelas dentro do degrau de metal: 1 no primeiro nível do par, 2 no segundo. */
function estrelasDo(nivel: number) {
  if (nivel <= 2) return 0;
  return nivel % 2 === 1 ? 1 : 2;
}

export function ClanPatente({
  emblema,
  patente,
  size = 72,
  mostrarNome = false,
}: {
  emblema: Emblema;
  patente: Patente;
  size?: number;
  mostrarNome?: boolean;
}) {
  const metal = metalDo(patente.nivel);
  const estrelas = estrelasDo(patente.nivel);
  const coroa = patente.nivel === 8;

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <div className="relative inline-flex" style={{ filter: metal.brilho === 'none' ? undefined : `drop-shadow(${metal.brilho})` }}>
        {coroa && (
          <svg viewBox="0 0 24 12" width={size * 0.4} className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
            <path d="M2 10 L4 3 L8 7 L12 1 L16 7 L20 3 L22 10 Z" fill="#EAB308" stroke="rgba(0,0,0,.35)" strokeWidth="1" />
          </svg>
        )}

        <div className="rounded-lg p-[3px]" style={{ background: metal.anel ?? 'transparent' }}>
          <ClanEmblem emblema={emblema} size={size} />
        </div>
      </div>

      {/* As estrelas ficam ABAIXO da bandeira, não em cima dela: sobrepostas na borda elas
          sumiam contra o fundo e ficavam pequenas demais pra contar de relance. */}
      {estrelas > 0 && (
        <div className="flex gap-1 -mt-0.5">
          {Array.from({ length: estrelas }, (_, i) => (
            <svg key={i} viewBox="0 0 10 10" width={size * 0.24} height={size * 0.24}>
              <path
                d="M5 0 L6.2 3.5 L10 3.5 L7 5.8 L8.1 9.5 L5 7.2 L1.9 9.5 L3 5.8 L0 3.5 L3.8 3.5 Z"
                fill={metal.anel ?? '#71717A'}
                stroke="rgba(0,0,0,.45)"
                strokeWidth="0.7"
              />
            </svg>
          ))}
        </div>
      )}

      {mostrarNome && (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted text-center leading-tight mt-1">
          {patente.nome}
        </p>
      )}
    </div>
  );
}

/** Barrinha "falta X pra próxima patente". */
export function ProgressoPatente({ patente }: { patente: Patente }) {
  if (!patente.proxima) {
    return (
      <p className="text-xs text-text-muted">
        Chegou ao topo. Não existe patente acima de <strong className="text-text-main">{patente.nome}</strong>.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs text-text-muted">
          Próxima: <strong className="text-text-main">{patente.proxima.nome}</strong>
        </span>
        <span className="text-xs text-text-muted tabular-nums">faltam {patente.proxima.faltam}</span>
      </div>
      <div className="h-1.5 rounded-full bg-card-subtle overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.round(patente.progresso * 100)}%` }}
        />
      </div>
    </div>
  );
}
