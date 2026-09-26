import { CalendarDays, PartyPopper } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Contagem regressiva pro encontro. O tom muda conforme a data chega: faltando muito ela é só
 * informativa, na última semana vira chamado, no dia vira convite pra postar foto, e depois do
 * encontro ela some sozinha em vez de virar um número negativo na tela.
 */

const UM_MINUTO = 60_000;

export interface EstadoContagem {
  fase: 'longe' | 'perto' | 'hoje' | 'passou';
  dias: number;
  horas: number;
  minutos: number;
}

export function calcularContagem(alvoIso: string, agora = Date.now()): EstadoContagem {
  const alvo = new Date(alvoIso);
  // O encontro é um dia inteiro, não um instante: só "passa" quando vira o dia seguinte.
  const fimDoDia = new Date(alvo);
  fimDoDia.setHours(23, 59, 59, 999);

  const restante = alvo.getTime() - agora;

  if (agora > fimDoDia.getTime()) return { fase: 'passou', dias: 0, horas: 0, minutos: 0 };

  // Já é o dia do encontro (mesmo que a hora marcada já tenha passado)
  const inicioDoDia = new Date(alvo);
  inicioDoDia.setHours(0, 0, 0, 0);
  if (agora >= inicioDoDia.getTime()) return { fase: 'hoje', dias: 0, horas: 0, minutos: 0 };

  const dias = Math.floor(restante / 86_400_000);
  const horas = Math.floor((restante % 86_400_000) / 3_600_000);
  const minutos = Math.floor((restante % 3_600_000) / 60_000);

  return { fase: dias <= 7 ? 'perto' : 'longe', dias, horas, minutos };
}

function useContagem(alvoIso: string | null) {
  const [estado, setEstado] = useState(() => (alvoIso ? calcularContagem(alvoIso) : null));

  useEffect(() => {
    if (!alvoIso) {
      setEstado(null);
      return;
    }
    setEstado(calcularContagem(alvoIso));
    const timer = setInterval(() => setEstado(calcularContagem(alvoIso)), UM_MINUTO);
    return () => clearInterval(timer);
  }, [alvoIso]);

  return estado;
}

function dataPorExtenso(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function Numero({ valor, rotulo, escuro }: { valor: number; rotulo: string; escuro: boolean }) {
  return (
    <div className="text-center">
      <div
        className={`font-display text-3xl sm:text-4xl leading-none tabular-nums ${
          escuro ? 'text-white' : 'text-text-main'
        }`}
      >
        {String(valor).padStart(2, '0')}
      </div>
      <div className={`text-[10px] uppercase tracking-wider mt-1 ${escuro ? 'text-white/60' : 'text-text-muted'}`}>
        {rotulo}
      </div>
    </div>
  );
}

/**
 * @param variante 'publica' = cartão escuro pra página inicial (antes do login);
 *                 'app' = faixa clara pro topo do feed.
 */
export function Countdown({
  eventDate,
  eventTitle,
  variante,
}: {
  eventDate: string | null;
  eventTitle?: string | null;
  variante: 'publica' | 'app';
}) {
  const estado = useContagem(eventDate);

  // Sem data marcada, ou encontro já passou: o bloco simplesmente não existe.
  if (!eventDate || !estado || estado.fase === 'passou') return null;

  const escuro = variante === 'publica';
  const titulo = eventTitle?.trim() || 'Nosso encontro';

  const moldura = escuro
    ? 'bg-black/40 backdrop-blur-md border border-white/15'
    : 'bg-card border border-border';

  if (estado.fase === 'hoje') {
    return (
      <div className={`rounded-2xl px-5 py-5 text-center ${escuro ? moldura : 'bg-primary/10 border border-primary/30'}`}>
        <PartyPopper size={22} className="mx-auto text-primary mb-2" />
        <p className={`font-display uppercase tracking-wider text-xl ${escuro ? 'text-white' : 'text-text-main'}`}>
          É hoje!
        </p>
        <p className={`text-sm mt-1 ${escuro ? 'text-white/70' : 'text-text-muted'}`}>
          {titulo} é hoje. Tire muita foto — e suba tudo aqui.
        </p>
      </div>
    );
  }

  const chamada =
    estado.fase === 'perto'
      ? estado.dias <= 1
        ? 'É amanhã!'
        : `Falta menos de uma semana`
      : `${dataPorExtenso(eventDate)}`;

  return (
    <div className={`rounded-2xl px-5 py-4 ${moldura}`}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <CalendarDays size={15} className="text-primary shrink-0" />
        <p className={`text-xs uppercase tracking-wider ${escuro ? 'text-white/70' : 'text-text-muted'}`}>
          {titulo} · {chamada}
        </p>
      </div>
      <div className="flex items-start justify-center gap-5 sm:gap-7">
        <Numero valor={estado.dias} rotulo={estado.dias === 1 ? 'dia' : 'dias'} escuro={escuro} />
        <Numero valor={estado.horas} rotulo="horas" escuro={escuro} />
        <Numero valor={estado.minutos} rotulo="min" escuro={escuro} />
      </div>
    </div>
  );
}
