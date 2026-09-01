import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function SaveStatusBadge({ status, compact }: { status: SaveStatus; compact?: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {status !== 'idle' && (
        <motion.span
          key={status}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className={`inline-flex items-center gap-1.5 font-medium rounded-full ${
            compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'
          } ${
            status === 'saving'
              ? 'bg-card-subtle text-text-muted'
              : status === 'saved'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
          }`}
        >
          {status === 'saving' && <Loader2 size={compact ? 10 : 12} className="animate-spin" />}
          {status === 'saved' && <Check size={compact ? 10 : 12} />}
          {status === 'error' && <AlertCircle size={compact ? 10 : 12} />}
          {status === 'saving' ? 'Salvando…' : status === 'saved' ? 'Salvo' : 'Erro ao salvar'}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
