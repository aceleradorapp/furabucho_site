import { registerSW } from 'virtual:pwa-register'

/**
 * Registro do service worker com atualização automática e silenciosa.
 *
 * O app troca de versão sozinho, sem perguntar nada pra ninguém -- por isso só roda em
 * produção. Em dev não existe "versão antiga" pra detectar, e o service worker fica
 * desligado de propósito (ver vite.config.ts); registrar aqui só geraria um pedido que
 * sempre falha, à toa.
 *
 * `registerType: 'autoUpdate'` (vite.config.ts) já faz a versão nova assumir o controle
 * sozinha assim que aparece (self.skipWaiting + clients.claim, em src/sw.ts). O que falta
 * é só recarregar a página -- o HTML/JS que já está na memória do navegador continua sendo
 * o antigo até isso acontecer.
 */
const CHAVE_ACABOU_DE_ATUALIZAR = 'fb-acabou-de-atualizar'

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedReload() {
      // Marca ANTES de recarregar: é assim que o UpdateToast sabe, no próximo carregamento,
      // que foi uma atualização (e não um F5 qualquer) e mostra o avisinho por alguns segundos.
      sessionStorage.setItem(CHAVE_ACABOU_DE_ATUALIZAR, '1')
      window.location.reload()
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Só confere de novo quando a pessoa REABRE o app -- não fica de hora em hora gastando
      // bateria e dados com o app já aberto. Cobre exatamente o caso do celular: sai, volta
      // depois de um tempo, checa na hora.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update()
      })
    },
    onRegisterError(err) {
      console.error('Falha ao registrar o service worker:', err)
    },
  })
}

/** Consumido uma vez pelo UpdateToast, logo depois do recarregamento causado pela atualização. */
export function acabouDeAtualizar() {
  const sim = sessionStorage.getItem(CHAVE_ACABOU_DE_ATUALIZAR) === '1'
  if (sim) sessionStorage.removeItem(CHAVE_ACABOU_DE_ATUALIZAR)
  return sim
}
