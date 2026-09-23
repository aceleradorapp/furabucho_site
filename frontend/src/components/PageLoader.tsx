import { Loader2 } from 'lucide-react';

export function PageLoader({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-text-muted">
      <Loader2 size={28} className="animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
