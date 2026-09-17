# Roadmap — Botão de Instalação (PWA) e App Casca (WebView) para Lojas

> Documento de planejamento, não de implementação. As duas frentes abaixo ainda não foram
> iniciadas — este arquivo serve só para você decidir por qual começar.

## Contexto atual (o que já existe hoje)

Antes de decidir, vale entender o que o projeto já tem nessa área, pra não duplicar esforço:

- **Site (`frontend/`):** React SPA responsivo, sem manifest PWA e sem service worker ainda —
  hoje não dá pra "instalar" o site como app em lugar nenhum.
- **App nativo (`mobile/`):** já existe um scaffold em **Expo + React Native + Expo Router**,
  com telas próprias (feed, galeria, login, perfil, postar) — não é um WebView, é um app nativo de
  verdade, mas ainda não publicado nas lojas. Hoje ele é distribuído via **APK direto** (página
  `/app` do site, com QR code pra baixar e instalar manualmente no Android) — sem passar pela Play
  Store nem App Store.
- **Duas frentes mobile coexistindo:** isso significa que, se seguirmos com o "App Casca"
  descrito abaixo, o projeto passa a ter **dois caminhos mobile em paralelo** (o nativo em
  `mobile/` e o casca/WebView novo). Vale decidir conscientemente se o casca é um atalho
  temporário pra entrar nas lojas rápido, ou se substitui o caminho nativo — comento isso nas
  observações de cada opção.

---

## Opção A — Botão de Instalação (PWA)

**O que é:** um botão na interface do site (ex: no rodapé ou no menu) que, quando o navegador
permite, dispara o prompt nativo de "Adicionar à tela inicial" — sem precisar ir a loja nenhuma.

**Custo/esforço:** baixo. **Tempo estimado:** 1 a 2 dias. **Custo financeiro:** zero (não passa
por loja, não tem taxa de desenvolvedor).

### Etapas

1. **Manifest + ícones**
   - Criar `frontend/public/manifest.webmanifest` (nome, ícones em vários tamanhos, cor de tema,
     `display: "standalone"`, `start_url`).
   - Gerar os ícones nos tamanhos exigidos (192x192, 512x512, e um "maskable" pra Android).
   - Linkar o manifest no `index.html`.

2. **Service worker mínimo**
   - Usar `vite-plugin-pwa` (a forma padrão de gerar isso com Vite, evita escrever
     service worker na mão) — configuração mínima, só o necessário pra o navegador considerar o
     site "instalável" (não precisamos de cache offline agressivo pra esse objetivo).

3. **Botão de instalação**
   - Capturar o evento `beforeinstallprompt` do navegador (Chrome/Edge/Android) num contexto
     React (ex: hook `useInstallPrompt`), guardar o evento, e só então mostrar o botão — ele deve
     ficar escondido se o navegador não disparar esse evento (ex: já instalado, ou navegador sem
     suporte).
   - Ao clicar, chamar `event.prompt()` e tratar a resposta (aceitou/recusou), escondendo o botão
     depois.
   - **Atenção especial ao iOS/Safari:** Safari não dispara `beforeinstallprompt` — não tem como
     automatizar lá. Pra iOS, o botão precisa detectar isso e mostrar uma instrução simples
     ("toque em Compartilhar → Adicionar à Tela de Início") em vez do prompt automático.

4. **Onde colocar o botão**
   - Sugestão: um banner discreto na página inicial (pra visitante) e/ou um item no menu do
     usuário logado (`PrivateLayout`) — decidir junto com você o texto/posicionamento.

5. **Teste**
   - Testar em Android (Chrome) o fluxo completo de instalação.
   - Testar em iOS (Safari) que a instrução alternativa aparece certo.
   - Confirmar que o ícone/nome aparecem certos na tela inicial depois de instalado.

### Observações
- Não precisa de conta em loja nenhuma, não tem processo de revisão, fica no ar assim que
  fizermos o deploy normal do site.
- É compatível com o app nativo existir ao mesmo tempo — um não atrapalha o outro.

---

## Opção B — App Casca (WebView) para as lojas oficiais

**O que é:** um app bem leve pra Android e iOS que só abre o site (`https://friendsface.com.br`)
em tela cheia dentro de uma WebView nativa — sem reescrever nenhuma tela, só uma "casca" pra
existir oficialmente na Play Store e na App Store.

**Custo/esforço:** médio. **Tempo estimado:** 1 a 2 semanas até publicar (a maior parte do tempo é
processo de revisão das lojas, não desenvolvimento). **Custo financeiro:** conta de desenvolvedor
Google Play (US$ 25, pagamento único) + conta Apple Developer Program (US$ 99/ano, recorrente).

### Etapas

1. **Escolher a ferramenta**
   - Recomendado: **Capacitor** (Ionic) — é feito exatamente pra esse cenário ("empacotar uma URL
     externa como app nativo"), suporta configurar `server.url` apontando pro site ao vivo em vez
     de empacotar arquivos locais. Mais leve que criar um projeto Expo/RN novo só pra isso.
   - Alternativa descartada: reaproveitar o `mobile/` (Expo) pra virar só uma WebView — não faz
     sentido, jogaria fora o trabalho nativo já feito lá.
   - Criar como projeto novo e separado (ex: `app-casca/` na raiz do repo), sem mexer no
     `mobile/` existente.

2. **Configuração base**
   - `npm init @capacitor/app`, apontar `server.url` pra `https://friendsface.com.br`.
   - Configurar ícone e splash screen (usando a identidade visual já existente — logo, cor
     laranja `#FF5E14`, fundo escuro `#0A0A0C`).
   - Configurar permissões nativas que o site usa: upload de foto (câmera/galeria), já que o app
     precisa autorizar isso na WebView pra funcionar igual ao navegador.

3. **Ajustes no site pra rodar bem dentro da WebView**
   - Testar upload de imagem, notificações do navegador (se houver), e comportamento de voltar
     (botão "voltar" do Android precisa navegar dentro da WebView, não fechar o app).
   - Confirmar que login/token funcionam normalmente dentro da WebView (cookies/localStorage).

4. **Build e teste nas plataformas**
   - Android: build via Android Studio, testar em emulador e em aparelho físico.
   - iOS: build via Xcode — **precisa de um Mac** (físico ou serviço de Mac na nuvem, ex:
     MacStadium/GitHub Actions macOS runner) pra gerar o build assinado.

5. **Publicação nas lojas**
   - Google Play: criar conta de desenvolvedor, preencher ficha da loja (descrição, screenshots,
     política de privacidade — o site precisa ter uma página de política de privacidade pública),
     enviar o `.aab`, aguardar revisão (geralmente rápida, 1-3 dias).
   - Apple App Store: criar conta Apple Developer, preencher a ficha na App Store Connect, enviar
     via Xcode/Transporter, aguardar revisão (mais rigorosa, pode levar de alguns dias a 1-2
     semanas, e a Apple historicamente é mais restritiva com apps que são "só uma WebView" —
     pode pedir ajustes ou justificativa de por que é um app e não só um site).

### Observações
- É a via oficial pra aparecer com ícone próprio na Play Store/App Store, com atualização
  automática do conteúdo (como o app só reflete o site, qualquer deploy do site já atualiza o
  app na hora, sem precisar re-publicar).
- Risco principal: revisão da Apple pode rejeitar apps "cascas" muito simples — vale já ir
  pensando em pequenos toques nativos (notificação push, algum recurso offline básico) caso a
  Apple rejeite na primeira tentativa.

---

## Comparativo rápido

| | Opção A — Botão PWA | Opção B — App Casca (lojas) |
|---|---|---|
| Tempo até estar pronto | 1-2 dias | 1-2 semanas (maioria é revisão de loja) |
| Custo financeiro | Zero | ~US$ 25 (Google, único) + US$ 99/ano (Apple) |
| Precisa de Mac | Não | Sim, pra build iOS |
| Aparece na Play Store/App Store | Não (instala direto do navegador) | Sim |
| Depende de aprovação externa | Não | Sim (revisão das lojas) |
| Risco de rejeição | Nenhum | Existe (Apple pode rejeitar "cascas" simples) |

## Recomendação

Começar pela **Opção A (botão PWA)** — é rápida, sem custo, sem dependência de aprovação externa,
e já entrega uma forma de "instalar" o site em qualquer celular imediatamente. A Opção B pode vir
depois, com mais calma, já que envolve custo recorrente e processo de revisão fora do nosso
controle.

Mas a decisão final é sua — me diga qual das duas (ou se as duas) você quer que eu comece.
