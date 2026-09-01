# Plano de Implementação — Portal Amigos Fura-Bucho

> Baseado em `espec/especificacao_projeto_amigos_fura_bucho.md` e `espec/design_system_claude.md`.
> Repositório: https://github.com/aceleradorapp/furabucho_site.git

## 1. Stack

**Frontend** (`/frontend`)
- React 18 + Vite + TypeScript
- Tailwind CSS (tokens do design system: `--color-primary #FF5E14`, etc.)
- Framer Motion (animações), lucide-react (ícones)
- Radix UI Dialog (modal de login), Embla Carousel (banners de eventos)
- React Router (rotas públicas vs. área de membro)
- Mobile-first obrigatório em todas as telas (bottom nav no logado)

**Backend** (`/backend`)
- Node.js + Express + TypeScript
- Prisma ORM → MySQL
- JWT (jsonwebtoken) + bcrypt para auth
- Multer para upload de fotos (posts, avisos, avatares) — disco local em `/uploads` no MVP
- Sem cadastro público: usuários são criados manualmente (seed/admin)

**Banco de dados**
- MySQL 8, no servidor existente (192.95.13.27), reaproveitando a instância já em produção
- Database dedicado: `furabucho_db`
- Usuário MySQL dedicado (não root) com privilégios só nesse database
- Firewall já libera a porta 3306 externamente — dev local conecta direto, sem túnel SSH

## 2. Portas locais (evitando conflito com o que já está em uso: 3000, 4000, 5173, 5432, 8080)
- Frontend (Vite dev server): **5180**
- Backend (API Express): **4321**

## 3. Estrutura de pastas
```
furabucho/
├── espec/                     (specs já existentes)
├── PLANO_IMPLEMENTACAO.md
├── frontend/
└── backend/
    ├── prisma/schema.prisma
    ├── src/
    └── uploads/
```

## 4. Modelo de dados (rascunho inicial)
- **User**: id, name, email, username, passwordHash, avatarUrl, role, createdAt
- **Event** (encontros): id, title, description, bannerUrl, eventDate, location, createdAt
- **Announcement** (avisos/top news): id, title, message, active, createdAt
- **Post** (feed): id, authorId, imageUrl, caption, createdAt
- **Like**: id, postId, userId, createdAt (unique postId+userId)
- **Comment**: id, postId, userId, text, createdAt

## 5. Fases de execução

1. **Infra & scaffold** — criar `frontend/` (Vite+React+TS+Tailwind) e `backend/` (Express+TS+Prisma), configurar `.env` (não versionado), conectar ao MySQL remoto, criar `furabucho_db` e usuário dedicado.
2. **Backend — auth** — schema Prisma (User), migrations, endpoints `/api/auth/login`, `/api/auth/forgot-password` (placeholder de e-mail), middleware JWT, seed dos membros iniciais.
3. **Backend — domínio** — CRUD de Event, Announcement, Post, Like, Comment; upload de imagens; guards de autenticação em tudo que é da área privada.
4. **Frontend — Landing pública** — Navbar, Hero com cantos recortados (cut-out), seção Sobre Nós, carrossel de eventos (Embla), botão que abre modal de login.
5. **Frontend — Auth modal** — Radix Dialog, formulário login/senha, recuperação de senha, feedback de loading/erro.
6. **Frontend — Área privada** — banner de avisos, feed estilo Instagram (cards, curtir com animação, comentários), FAB de criar post, bottom navigation mobile.
7. **Polimento** — micro-interações Framer Motion (stagger fade-in, hover pílulas, confete no like), QA responsivo mobile-first em todas as telas.
8. **Deploy** — replicar padrão já usado no servidor (nginx + Node + processo persistente tipo o `edgemotionApi2`), domínio a definir, HTTPS via certbot (já usado no servidor).

## 6. Pendências que bloqueiam o próximo passo
- [ ] Credencial de administrador do MySQL (root ou usuário com `CREATE DATABASE`/`CREATE USER`) — o SSH dá acesso ao Linux, não ao MySQL.
- [ ] Forma de autenticar o `git push` no repositório (token de acesso pessoal do GitHub, já que não há `gh` autenticado nem credencial salva na máquina).
