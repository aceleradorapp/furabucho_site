import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest (em vez do generateSW padrão) porque o service worker passou a ser
      // escrito à mão em src/sw.ts -- push exige código nosso rodando com o app fechado.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // Desligado no dev de propósito: com injectManifest, o service worker importa o workbox
      // como módulo e o registro automático corre contra a pré-compilação de dependências do
      // Vite — falha na primeira carga e funciona na segunda, poluindo o console com um erro
      // que não existe em produção. Para testar o service worker de verdade, use o build:
      // `npm run build && npm run preview`.
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Amigos Fura-Bucho',
        short_name: 'Fura-Bucho',
        description: 'Portal da família Amigos Fura-Bucho — feed, galeria e encontros.',
        lang: 'pt-BR',
        theme_color: '#0A0A0C',
        background_color: '#0A0A0C',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Com injectManifest a chave passa a ser esta (a 'workbox' é ignorada); mantém a mesma
      // lista de arquivos que o app já guardava antes.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpeg,jpg,ico}'],
      },
    }),
  ],
  server: {
    port: 5180,
    strictPort: true,
  },
  // `npm run preview` serve o build de verdade -- é o único jeito de testar o service worker
  // (e portanto o push) na máquina local, já que no dev ele fica desligado. O build usa caminho
  // relativo pra API, então aqui repassamos pro backend local.
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:4321',
      '/uploads': 'http://localhost:4321',
    },
  },
})
