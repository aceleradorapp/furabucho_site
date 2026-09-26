/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

/**
 * Service worker do app.
 *
 * Antes ele era gerado inteiro pelo plugin. Passou a ser escrito à mão porque push só funciona
 * com código nosso aqui dentro — é este arquivo que roda com o app fechado. O precache continua
 * fazendo o mesmo que fazia antes; só deixou de ser invisível.
 */

declare const self: ServiceWorkerGlobalScope;

// A lista de arquivos a guardar é injetada pelo plugin na hora do build.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Sem isso, a versão nova do app só assumiria depois que a pessoa fechasse todas as abas.
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

interface AvisoPush {
  title?: string;
  body?: string;
  link?: string;
  tag?: string;
}

self.addEventListener('push', (event) => {
  // Um push sem corpo legível não pode derrubar o handler: mostramos algo genérico em vez de
  // engolir o aviso.
  let dados: AvisoPush = {};
  try {
    dados = event.data ? (event.data.json() as AvisoPush) : {};
  } catch {
    dados = { body: event.data?.text() };
  }

  const titulo = dados.title || 'Amigos Fura-Bucho';
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.body || 'Tem novidade no Fura-Bucho.',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: dados.tag,
      data: { link: dados.link || '/feed' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data as { link?: string } | undefined)?.link || '/feed';

  event.waitUntil(
    (async () => {
      const abas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Se o app já está aberto, reaproveita a janela em vez de abrir outra por cima.
      for (const aba of abas) {
        if ('focus' in aba) {
          await aba.focus();
          if ('navigate' in aba) await aba.navigate(destino).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(destino);
    })(),
  );
});
