import {
  Anchor, Axe, Beer, Bird, Bomb, Bone, CarFront, Cat, CloudLightning, Coffee, Crown, Dice5,
  Dog, Drumstick, Fish, Flame, Gamepad2, Gem, Guitar, HandMetal, Heart, KeyRound, Moon,
  Mountain, Music, Pizza, Rocket, ShipWheel, Shield, Skull, Sparkles, Star, Sun, Swords,
  Tent, Trees, Trophy, Waves, Wine, Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Desenha a bandeira do clã a partir das ESCOLHAS guardadas no banco — não de uma imagem.
 *
 * Vantagem prática: sai nítida em qualquer tamanho (do ícone de 24px ao cabeçalho grande),
 * não ocupa disco no servidor, e ninguém sobe imagem imprópria.
 */

export interface Emblema {
  shape: string;
  division: string;
  color1: string;
  color2: string;
  symbol: string;
}

// Importados um a um de propósito: import dinâmico quebraria o tree-shaking e traria a
// biblioteca inteira pro pacote final.
const SIMBOLOS: Record<string, LucideIcon> = {
  crown: Crown, anchor: Anchor, beer: Beer, flame: Flame, star: Star, shield: Shield,
  guitar: Guitar, 'dice-5': Dice5, trophy: Trophy, zap: Zap, heart: Heart, skull: Skull,
  swords: Swords, 'ship-wheel': ShipWheel, fish: Fish, drumstick: Drumstick, coffee: Coffee,
  'car-front': CarFront, bird: Bird, trees: Trees, mountain: Mountain, sun: Sun, moon: Moon,
  'cloud-lightning': CloudLightning, gem: Gem, 'key-round': KeyRound, bone: Bone, cat: Cat,
  dog: Dog, rocket: Rocket, bomb: Bomb, wine: Wine, pizza: Pizza, music: Music,
  'gamepad-2': Gamepad2, 'hand-metal': HandMetal, sparkles: Sparkles, axe: Axe, tent: Tent,
  waves: Waves,
};

// Contorno de cada formato, desenhado numa caixa de 100x120.
const FORMAS: Record<string, string> = {
  escudo: 'M50 4 L96 18 V62 C96 90 74 108 50 116 C26 108 4 90 4 62 V18 Z',
  'escudo-redondo': 'M50 4 C74 4 96 12 96 12 V60 C96 92 74 110 50 116 C26 110 4 92 4 60 V12 C4 12 26 4 50 4 Z',
  brasao: 'M8 8 H92 V70 C92 96 72 110 50 116 C28 110 8 96 8 70 Z',
  circulo: 'M50 8 A52 52 0 1 1 49.9 8 Z',
  losango: 'M50 2 L98 60 L50 118 L2 60 Z',
  bandeira: 'M6 8 H94 V96 L50 116 L6 96 Z',
};

/** Divisões heráldicas: como as duas cores se repartem dentro do formato. */
function Fundo({ division, color1, color2 }: { division: string; color1: string; color2: string }) {
  const cheio = <rect x="0" y="0" width="100" height="120" fill={color1} />;
  switch (division) {
    case 'metade':
      return (
        <>
          {cheio}
          <rect x="50" y="0" width="50" height="120" fill={color2} />
        </>
      );
    case 'quartos':
      return (
        <>
          {cheio}
          <rect x="50" y="0" width="50" height="60" fill={color2} />
          <rect x="0" y="60" width="50" height="60" fill={color2} />
        </>
      );
    case 'faixas':
      return (
        <>
          {cheio}
          {[0, 2, 4].map((i) => (
            <rect key={i} x="0" y={i * 20} width="100" height="20" fill={color2} />
          ))}
        </>
      );
    case 'chevron':
      return (
        <>
          {cheio}
          <path d="M50 30 L100 80 V120 H0 V80 Z" fill={color2} />
        </>
      );
    default:
      return cheio;
  }
}

export function ClanEmblem({
  emblema,
  size = 64,
  className = '',
}: {
  emblema: Emblema;
  size?: number;
  className?: string;
}) {
  const Simbolo = SIMBOLOS[emblema.symbol] ?? Crown;
  const forma = FORMAS[emblema.shape] ?? FORMAS.escudo;
  const idClip = `clip-${emblema.shape}-${emblema.division}-${emblema.symbol}`.replace(/[^a-z0-9-]/gi, '');

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={(size * 120) / 100}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Bandeira do clã"
    >
      <defs>
        <clipPath id={idClip}>
          <path d={forma} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${idClip})`}>
        <Fundo division={emblema.division} color1={emblema.color1} color2={emblema.color2} />
      </g>
      <path d={forma} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="3" />

      {/* O símbolo vai duas vezes: um traço escuro por baixo e o branco por cima. É o que
          garante que ele apareça tanto sobre cor clara quanto escura, sem calcular contraste. */}
      <g transform="translate(28, 36)">
        <Simbolo size={44} color="rgba(0,0,0,.45)" strokeWidth={3.5} absoluteStrokeWidth />
      </g>
      <g transform="translate(28, 36)">
        <Simbolo size={44} color="#fff" strokeWidth={2} absoluteStrokeWidth />
      </g>
    </svg>
  );
}
