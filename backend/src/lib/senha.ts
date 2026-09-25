/**
 * Senha "de balcao": a que o admin entrega pra pessoa entrar pela primeira vez.
 *
 * E proposital ser uma senha obvia e facil de ditar por telefone ou WhatsApp -- ela nunca
 * sobrevive ao primeiro acesso, porque quem esta com ela e obrigado a trocar antes de usar o
 * app. Por isso tambem e recusada como senha NOVA na troca.
 *
 * Fica aqui, num lugar so, pra nao existir uma copia no cadastro e outra no login: se as duas
 * se desencontrassem, o app entregaria uma senha e cobraria outra.
 */
export const SENHA_PADRAO = '12345678';
