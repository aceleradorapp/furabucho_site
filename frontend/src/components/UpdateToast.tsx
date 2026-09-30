import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { acabouDeAtualizar } from '../pwa'

const DURACAO_MS = 2500

/**
 * Avisa, bem discreto, que o app acabou de trocar de versão sozinho -- sem botão, sem
 * precisar ler nada, some sozinho em poucos segundos.
 *
 * Não usa o sino de avisos: aquele é pra coisa pessoal (curtida, comentário, convite de
 * clã) -- tem "quem" e "pra onde ir" ao clicar. Isto aqui é status técnico do aparelho, não
 * tem nada disso, e cada celular percebe a atualização num momento diferente (quando cada
 * um reabre o app). Não faz sentido morar no sino nem ficar guardado em lugar nenhum.
 */
export function UpdateToast() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    if (!acabouDeAtualizar()) return
    setVisivel(true)
    const t = setTimeout(() => setVisivel(false), DURACAO_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-x-0 bottom-24 md:bottom-6 z-50 flex justify-center pointer-events-none px-4">
      <AnimatePresence>
        {visivel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-lg text-sm text-text-main"
          >
            <Sparkles size={15} className="text-primary shrink-0" />
            Atualizado
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
