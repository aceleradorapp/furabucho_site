import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

/**
 * Inscrição do aparelho para receber aviso com o app fechado.
 *
 * Detalhe que manda em tudo: no iPhone isso só funciona com o app instalado na tela inicial
 * (iOS 16.4+). Quem abrir pelo Safari como aba nunca vai conseguir se inscrever — por isso o
 * hook devolve `precisaInstalar`, pra tela pedir a instalação em vez de oferecer um botão que
 * não vai funcionar.
 */

type Estado = 'carregando' | 'indisponivel' | 'precisa-instalar' | 'desligado' | 'ligado' | 'bloqueado';

function base64ParaUint8(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normal);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function instaladoNaTela() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function usePush() {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [ocupado, setOcupado] = useState(false);

  const suportado =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  const revisar = useCallback(async () => {
    if (!suportado) {
      // No iPhone fora da tela inicial o PushManager nem existe — a causa é essa, não falta
      // de suporte do aparelho, e a mensagem pra pessoa precisa ser diferente.
      setEstado(ehIOS() && !instaladoNaTela() ? 'precisa-instalar' : 'indisponivel');
      return;
    }
    if (Notification.permission === 'denied') {
      setEstado('bloqueado');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const inscricao = await reg.pushManager.getSubscription();
      setEstado(inscricao ? 'ligado' : 'desligado');
    } catch {
      setEstado('indisponivel');
    }
  }, [suportado]);

  useEffect(() => {
    revisar();
  }, [revisar]);

  const ligar = useCallback(async () => {
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        setEstado(permissao === 'denied' ? 'bloqueado' : 'desligado');
        return false;
      }

      const { chave } = await api.get<{ chave: string | null }>('/push/chave-publica');
      if (!chave) {
        setEstado('indisponivel');
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const inscricao =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ParaUint8(chave),
        }));

      await api.post('/push/inscrever', inscricao.toJSON());
      setEstado('ligado');
      return true;
    } catch {
      setEstado('desligado');
      return false;
    } finally {
      setOcupado(false);
    }
  }, []);

  const desligar = useCallback(async () => {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const inscricao = await reg.pushManager.getSubscription();
      if (inscricao) {
        // Avisa o servidor antes de cancelar: depois de cancelar, o endpoint some e não haveria
        // como dizer qual linha apagar.
        await api.post('/push/desinscrever', { endpoint: inscricao.endpoint }).catch(() => undefined);
        await inscricao.unsubscribe();
      }
      setEstado('desligado');
    } finally {
      setOcupado(false);
    }
  }, []);

  return { estado, ocupado, ligar, desligar, revisar };
}
