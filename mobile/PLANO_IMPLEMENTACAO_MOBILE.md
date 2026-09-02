# Plano de Implementação — App Mobile (Android + iOS)

> Complementa o `PLANO_IMPLEMENTACAO.md` da raiz (site). Este arquivo cobre só o app.

## 1. Objetivo

App nativo pro Portal Amigos Fura-Bucho, praticamente com as mesmas funcionalidades do
site, mas com layout/UX inspirado no Instagram (feed em cards, navegação inferior por
ícones, tela cheia pra mídia) usando a identidade visual já definida no site:

- Fundo escuro `#0A0A0C` / cards `#0F0F12` e `#141418`
- Laranja de destaque `#FF5E14` (hover `#E04D0B`)
- Fonte Plus Jakarta Sans (texto) e Oswald/Bebas Neue (títulos/display)
- Tela de splash obrigatória na abertura

## 2. Stack escolhida

- **Expo (SDK atual) + React Native + TypeScript** — permite compilar pra iOS sem precisar
  de um Mac local (via EAS Build na nuvem), e tem suporte de primeira classe pra splash
  screen, ícone e updates OTA.
- **Expo Router** — roteamento por arquivos (pasta `app/`), já vem com integração nativa
  de splash screen e abas, evita configurar `react-navigation` na mão.
- **expo-splash-screen** — controla a splash nativa (mantém visível até o app carregar
  sessão salva/fontes, esconde com transição).
- **expo-secure-store** — guarda o JWT no keychain/keystore do dispositivo (equivalente
  seguro ao `localStorage` usado no site).
- **expo-image** — cache e performance de imagem melhores que `<Image>` padrão, importante
  num feed de fotos.
- **expo-image-picker** + **expo-image-manipulator** — selecionar/cortar foto e vídeo do
  rolo ou câmera, equivalente ao cropper usado no site.
- **expo-av** (ou `expo-video` conforme SDK) — reprodução de vídeo no feed.
- **lucide-react-native** — mesma família de ícones usada no site (`lucide-react`), pra
  manter consistência visual entre site e app.
- **axios ou fetch simples** — reaproveita a mesma API REST do backend Express, sem
  nenhuma mudança no servidor.

Sem Redux/Zustand por enquanto: o app é pequeno o bastante pra Context API (mesmo padrão
do `AuthContext.tsx` do site) resolver estado de auth; estado de tela usa `useState`/React
Query se a paginação do feed pedir cache mais sofisticado mais adiante.

## 3. Estrutura de pastas (proposta)

```
mobile/
├── app/                        # rotas (Expo Router)
│   ├── _layout.tsx             # stack raiz + splash + fontes + AuthProvider
│   ├── (auth)/
│   │   └── login.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx         # tab bar estilo Instagram
│   │   ├── feed/
│   │   │   ├── index.tsx
│   │   │   └── novo.tsx        # criar post (foto/vídeo/texto)
│   │   ├── galeria.tsx
│   │   ├── novidades.tsx
│   │   └── perfil.tsx
│   └── post/[id].tsx           # detalhe/comentários
├── src/
│   ├── api/client.ts           # espelha frontend/src/api/client.ts
│   ├── auth/AuthContext.tsx    # espelha o do site (login, token, permissions)
│   ├── components/             # Avatar, PostCard, ConfirmDialog, etc.
│   └── theme/tokens.ts         # cores/fontes copiadas do site
├── assets/
│   ├── splash-icon.png
│   └── icon.png
├── app.json
└── package.json
```

## 4. Tela de Splash

- Fundo `#0A0A0C`, logo "FB" (círculo laranja) centralizado, sem texto de loading.
- Configurada via `app.json` (`expo-splash-screen` plugin) + `SplashScreen.preventAutoHideAsync()`
  no `_layout.tsx` raiz, escondida manualmente só depois de:
  1. Fontes carregadas (`useFonts`)
  2. Sessão restaurada do `expo-secure-store` (login automático se token válido)

## 5. Navegação estilo Instagram

Tab bar inferior fixa, ícones (lucide-react-native), sem texto (ou texto só no ativo):

`Feed` · `Galeria` · `[+ Postar]` (botão central destacado, laranja) · `Novidades` (com
badge de não lidas) · `Perfil`

Publicar (`+`) abre modal full-screen (foto/vídeo/texto + cortar imagem), igual ao fluxo
do site.

## 6. Mapeamento de telas → endpoints existentes

| Tela app | Endpoint(s) backend (já existem) |
|---|---|
| Login | `POST /api/auth/login` |
| Trocar senha obrigatória | `POST /api/auth/change-password` |
| Feed (listar/curtir/comentar) | `GET/POST /api/posts`, `/api/posts/:id/like`, `/api/posts/:id/comments` |
| Criar post | `POST /api/posts` (multipart foto/vídeo) |
| Perfil próprio | `GET /api/auth/me`, `PUT /api/users/:id/profile-extras` |
| Galeria | `GET /api/gallery` |
| Novidades (Announcements) | `GET /api/announcements`, `POST /api/announcements/:id/view` |

Fora do escopo inicial do app (ficam só no site por enquanto): Configurações, Membros,
Papéis & Permissões, Permissões por usuário — telas administrativas usadas por poucas
pessoas, sem ganho de UX em virar app.

## 7. Autenticação e API

- Mesmo JWT do backend; guardado com `expo-secure-store` em vez de `localStorage`.
- **Base URL da API**: variável de ambiente via `app.config.ts` (`extra.apiUrl`), não
  hardcoded — hoje aponta pra `http://192.95.13.27:9000/api` (mesmo servidor do site).
- ⚠️ **Bloqueio conhecido**: o servidor ainda não tem HTTPS (pendência já registrada no
  `PLANO_IMPLEMENTACAO.md` da raiz e em `docs/private/SERVER_ACCESS.md`). iOS bloqueia
  tráfego HTTP puro por padrão (App Transport Security) e Android bloqueia a partir do
  SDK 28. Pra desenvolvimento, o `app.json` vai declarar uma exceção de domínio pro IP do
  servidor (`NSAppTransportSecurity` / `usesCleartextTraffic`); **antes de publicar nas
  lojas de verdade, o domínio + HTTPS via certbot precisa estar pronto** — não dá pra
  contornar isso numa build de produção real.

## 8. Fases de implementação

1. **Scaffold** — criar projeto Expo + Router, tema (cores/fontes), splash screen, tab
   bar vazia navegável.
2. **Autenticação** — tela de login, guarda de sessão (secure-store + auto-login),
   trocar senha obrigatória no 1º acesso.
3. **Feed (leitura)** — listar posts (foto/vídeo/texto), curtidas, comentários — fatia
   vertical principal do app.
4. **Criar post** — seleção de mídia, corte de imagem, publicar.
5. **Perfil** — ver/editar dados próprios, trocar avatar.
6. **Galeria** — álbuns e fotos existentes do site.
7. **Novidades** — lista, marcar como visto, abrir anúncio em tela cheia.
8. **Polimento + build** — ícone, splash final, EAS Build (Android `.aab`/iOS `.ipa`),
   testar em dispositivo físico.
9. **Publicação nas lojas** — exige conta de desenvolvedor Apple (US$99/ano) e Google
   Play (US$25 único) — só necessário nesta fase, não antes.

Cada fase termina com o app rodando testável (Expo Go em dev, ou build interna) antes de
avançar pra próxima — igual ao padrão adotado no site.

## 9. Pendências que afetam o app (herdadas do site)

- Domínio + HTTPS no servidor (bloqueia publicação real nas lojas, não bloqueia dev).
- Nada específico de mobile além disso — o backend já serve JSON puro, reaproveitável
  sem mudanças de schema ou rota.
