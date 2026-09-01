# 📋 Especificação Funcional & Estrutura de UX/UI

> **Projeto:** Portal Amigos Fura-Bucho  
> **Público-alvo:** Grupo exclusivo de amigos de longa data (quase uma família) que se reúnem anualmente.  
> **Tom de Voz:** Acolhedor, nostálgico, vibrante, moderno e exclusivo (acesso privado pós-landing page).

---

## 1. 🎯 Visão Geral do Produto & Arquitetura de Informação

O portal é dividido em duas grandes experiências:
1. **Landing Page Pública:** Imersiva, visualmente idêntica ao design system de referência, focada em contar a história da amizade, divulgar o próximo encontro/evento anual e dar acesso exclusivo via login.
2. **Área Privada dos Membros (Pós-Login):** Uma rede social interna (estilo feed do Instagram) com notícias de topo e linha do tempo de postagens com fotos, mensagens e interações da galera.

---

## 2. 🏛️ Estrutura das Páginas & Componentes

### 🌟 2.1. Página Inicial Pública (Landing Page)
* **Navbar / Top Header:**
  - **Logo:** Marcador circular laranja + "Amigos Fura-Bucho" (com subtítulo sutil: *"Desde [Ano] • Tradição & Família"*).
  - **Menu de Navegação:** `Sobre Nós` | `Próximo Encontro` | `Histórias` | `Galeria Histórica`.
  - **Ação Principal:** Botão em pílula `Entrar` / `Área do Membro` que aciona o modal de login.
* **Hero Section (O Grande Destaque):**
  - Container assimétrico com a foto principal do grupo (alta resolução e tratamento de cor).
  - Título central imponente: *"TRADIÇÃO, RISADAS & UNIÃO"* (ou nome do encontro atual).
  - Botão de ação integrado na curva inferior: `Ver Detalhes do Encontro`.
* **Seção Sobre Nós (A Família Fura-Bucho):**
  - História resumida da confraternização, contador de encontros realizados e anos de história.
* **Seção de Eventos & Encontros (Carrossel Dinâmico):**
  - Slider interativo com os banners oficiais dos encontros (Ex: *"Festa 2026 - Onde Tudo Começou"*).
  - Capacidade de suportar múltiplas artes promocionais com data, local e contagem regressiva para o próximo evento.

---

### 🔐 2.2. Componente de Autenticação (Modal de Login)
* **Comportamento:**
  - Janela modal (`Dialog`) limpa e moderna, com fundo *backdrop-blur* (desfoque do fundo).
  - Sem opção de cadastro público (acesso estritamente fechado para membros).
* **Campos do Formulário:**
  - `E-mail ou Usuário`
  - `Senha` (com botão de exibir/ocultar senha)
  - Link de recuperação: `"Esqueci minha senha"` (dispara fluxo de envio de e-mail de redefinição).
  - Botão de submissão estilizado em pílula laranja com estado de *loading* / feedback de erro suave.

---

### 📱 2.3. Área Interna dos Membros (Feed Social Exclusivo)
* **Top News & Avisos (Banner Superior):**
  - Barra dinâmica ou carrossel de avisos importantes da diretoria/organizadores (Ex: *"Camisetas do encontro liberadas!", "Pix da chácara até dia 10"*).
* **Feed Estilo Instagram (Linha do Tempo):**
  - **Cards de Postagem:**
    - Cabeçalho: Foto de perfil do amigo + Nome + Tempo da postagem.
    - Mídia: Foto do momento (churrasco, fotos antigas, resenhas).
    - Ações: Botão de Curtir (ícone de coração com animação vibrante ao clicar e contador de likes) e Botão de Comentários.
    - Descrição: Mensagem/resenha do autor da postagem.
* **Botão Flutuante (FAB) / Criador de Post:**
  - Permite ao amigo logado enviar uma nova foto com legenda rapidamente.

---

## 3. 💡 Diretrizes de UX & Boas Práticas Recomendadas

1. **Segurança & Privacidade:**
   - Rotas protegidas (Auth Guards) para garantir que apenas usuários logados acessem o feed e as fotos pessoais.
2. **Responsividade Mobile-First:**
   - 90% das interações no feed de fotos acontecem pelo celular. O layout mobile deve ter navegação inferior (Bottom Navigation Bar) na área logada para fácil acesso com o polegar.
3. **Feedback Visual:**
   - Toast notifications elegantes ao curtir, fazer login ou quando novos avisos forem postados.

Muito importante, tem q ser responsivo para acesso com celular, não esqueça disso