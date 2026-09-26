import { UserRound } from 'lucide-react';
import { useState } from 'react';
import { UPLOADS_BASE } from '../../lib/config';

/**
 * A cara da pessoa no mundo dos clãs.
 *
 * Aqui é sempre CARICATURA, nunca a foto de perfil — de propósito. A foto é a pessoa real;
 * a caricatura é o personagem. Isso faz a área dos clãs parecer outro lugar, de brincadeira,
 * em vez de mais uma aba do mesmo app.
 *
 * Quem ainda não tem caricatura aparece apagado: está no clã, mas não conta como ativo.
 */
export function Caricatura({
  nome,
  caricatureUrl,
  size = 44,
  mostrarNome = false,
}: {
  nome: string;
  caricatureUrl?: string | null;
  size?: number;
  mostrarNome?: boolean;
}) {
  // Arquivo apagado no servidor mostraria o texto alternativo vazando pra fora do círculo.
  // Cai no ícone de sempre, que é feio mas não quebra a tela.
  const [falhou, setFalhou] = useState(false);
  const inativo = !caricatureUrl || falhou;

  return (
    <div className="inline-flex flex-col items-center gap-1 min-w-0" title={inativo ? `${nome} — ainda sem caricatura` : nome}>
      <div
        className={`rounded-full overflow-hidden bg-card-subtle border border-border flex items-center justify-center shrink-0 ${
          inativo ? 'opacity-40 grayscale' : ''
        }`}
        style={{ width: size, height: size }}
      >
        {caricatureUrl && !falhou ? (
          <img
            src={`${UPLOADS_BASE}${caricatureUrl}`}
            alt={nome}
            onError={() => setFalhou(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <UserRound size={size * 0.5} className="text-text-muted" />
        )}
      </div>
      {mostrarNome && (
        <p className={`text-[11px] text-center leading-tight truncate max-w-[72px] ${inativo ? 'text-text-muted' : 'text-text-main'}`}>
          {nome}
        </p>
      )}
    </div>
  );
}
