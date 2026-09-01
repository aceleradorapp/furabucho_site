# 🎨 Design System & UI/UX Styling Specification (Inspirado no Layout Base)

> **Documento de Especificação Visual e Técnica de Interface para o Claude**  
> **Tema Base:** Layout Moderno "Card-in-Canvas", Bordas Orgânicas/Assimétricas, Micro-interações e Animações Fluidas.

---

## 1. 📦 Stack Técnica Recomendada & Dependências

Para alcançar com precisão pixel-perfect o layout da imagem, com as curvas assimétricas e animações de alta performance:

```bash
# Framework & Styling
npm install lucide-react clsx tailwind-merge framer-motion

# Carrossel / Banners Dinâmicos
npm install swiper
# ou para shadcn/radix:
npm install embla-carousel-react

# Componentes de Modal/Dialog acessíveis (para o Modal de Login)
npm install @radix-ui/react-dialog

# Efeitos Visuais Adicionais (opcional, para confetes ou micro-interações de curtir)
npm install canvas-confetti
```

---

## 2. 🎨 Paleta de Cores & Design Tokens

```css
:root {
  /* Cores Principais */
  --color-primary: #FF5E14;          /* Laranja vibrante principal (botões de ação e destaques) */
  --color-primary-hover: #E04D0B;    /* Laranja escuro no hover */
  --color-accent-dark: #121212;      /* Preto/Grafite quase absoluto (pill buttons e headers escuros) */
  
  /* Fundos e Estrutura */
  --color-bg-canvas: #FF6827;        /* Laranja de fundo geral estilo canvas externo */
  --color-card-bg: #FFFFFF;          /* Branco puro para o container principal em formato de card */
  --color-card-subtle: #F8F9FA;      /* Cinza muito suave para cards internos de eventos/endereços */

  /* Tipografia & Linhas */
  --color-text-main: #18181B;        /* Preto zinc para títulos */
  --color-text-muted: #71717A;       /* Cinza para textos secundários */
  --color-border: #E4E4E7;           /* Bordas sutis */
  
  /* Gradiente Hero (Overlay da imagem) */
  --gradient-hero: linear-gradient(135deg, rgba(28, 10, 48, 0.65) 0%, rgba(139, 44, 255, 0.4) 50%, rgba(255, 94, 20, 0.3) 100%);
}
```

---

## 3. 📐 Estrutura do Layout & Assimetria Visual (Chave do Design)

O diferencial marcante deste layout é o **Container Principal Arredondado** com um **Hero recortado nos cantos** (cut-out invertido):

### Desktop Layout:
1. **Canvas Externo:** Fundo com gradiente ou cor sólida laranja viva (`#FF6827`).
2. **Container Principal (Main Card):** 
   - `max-w-7xl`, centralizado com margens generosas.
   - `rounded-[32px] md:rounded-[44px]` com fundo branco e sombra suave (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15)`).
   - Padding interno superior contendo o Header (`px-10 py-6`).
3. **Hero Image com Cantos Recortados (Asymmetrical Cut-out):**
   - No topo esquerdo do hero: Recorte côncavo/negativo que abriga um botão pílula escuro (*Ex: Prayer Request / Status do Grupo*).
   - No canto inferior direito: Recorte em ângulo suave para fora do hero onde se acomoda o botão primário flutuante em pílula (*Watch Sermons / Ver Eventos*).
   - *Implementação sugerida:* Pode ser feito usando pseudo-elementos (`::before`, `::after` com `radial-gradient` para criar o canto invertido) ou SVG `clip-path` orgânico.
4. **Tipografia do Hero:**
   - Tipografia display sem serifa, *all-caps*, condensada e imponente (Ex: `Anton`, `Oswald` ou `Bebas Neue` do Google Fonts) com `tracking-wider` e cor branca/creme centralizada.

### Mobile Layout:
- O layout se reorganiza em **cards modulares empilhados** (`gap-4`).
- O Hero mantém a proporção horizontal com cantos arredondados (`rounded-2xl`).
- Cards de informações (Datas, Local, etc.) ficam dispostos em colunas de 2x1 ou empilhados com linhas divisórias sutis.

---

## 4. ✨ Animações & Micro-interações (Framer Motion)

1. **Entrada da Página Principal:**
   - Efeito de *Staggered Fade-in-up* nas seções: O container branco sobe suavemente (`y: [30, 0], opacity: [0, 1]`).
   - O título central do Hero entra com efeito de letras reveladas (*letter-spacing expansivo e fade-in*).
2. **Hover nos Botões Pílula:**
   - Efeito magnético suave ou expansão de escala (`scale: 1.04`), com brilho sutil (*glow*) no botão laranja.
3. **Banner de Eventos (Carrossel Interativo):**
   - Transição suave entre banners (Fade & Slide com `Swiper` ou `Framer Motion AnimatePresence`).
   - Autoplay pausável no hover com indicador de progresso em barra/pílula animada.
4. **Feed Estilo Instagram (Área Logada):**
   - Ao curtir um card, disparar uma animação de coração saltando no centro da foto (`scale: [0, 1.3, 1]`) acompanhado de micro-partículas de confete ou brilho.
