import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Avatar } from './Avatar';

interface NotificationActor {
  id: number;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
}

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  link: string | null;
  lida: boolean;
  createdAt: string;
  actor: NotificationActor | null;
}

const INTERVALO_BUSCA = 45000;

function tempoAtras(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `${horas}h`;
  return `${Math.floor(horas / 24)}d`;
}

export function NotificationsBell({ className, iconSize = 22 }: { className: string; iconSize?: number }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [itens, setItens] = useState<NotificationItem[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);

  async function carregar() {
    try {
      const data = await api.get<{ naoLidas: number; notificacoes: NotificationItem[] }>('/notifications');
      setItens(data.notificacoes);
      setNaoLidas(data.naoLidas);
    } catch {
      // silencioso: se falhar (rede instável), tenta de novo no próximo ciclo
    }
  }

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, INTERVALO_BUSCA);
    return () => clearInterval(timer);
  }, []);

  // Abrir o sino já marca tudo como lido — o badge some, mas a lista continua ali pra ler.
  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && naoLidas > 0) {
      setNaoLidas(0);
      try {
        await api.post('/notifications/read-all');
        setItens((prev) => prev.map((n) => ({ ...n, lida: true })));
      } catch {
        // se falhar, o próximo carregamento devolve o estado real
      }
    }
  }

  function abrirNotificacao(n: NotificationItem) {
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function apagar(n: NotificationItem) {
    const anterior = itens;
    setItens((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.lida) setNaoLidas((v) => Math.max(0, v - 1));
    try {
      await api.delete(`/notifications/${n.id}`);
    } catch {
      setItens(anterior); // não deu certo: devolve o aviso pra lista em vez de sumir calado
      carregar();
    }
  }

  async function limparTudo() {
    const anterior = itens;
    setItens([]);
    setNaoLidas(0);
    try {
      await api.delete('/notifications');
    } catch {
      setItens(anterior);
      carregar();
    }
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button className={className} aria-label="Avisos" title="Avisos">
          <span className="relative inline-flex">
            <Bell size={iconSize} />
            {naoLidas > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="bg-card rounded-xl shadow-2xl border border-border py-2 w-80 max-w-[92vw] max-h-96 overflow-y-auto z-40"
        >
          <p className="px-4 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Avisos</p>

          {itens.length === 0 && (
            <p className="px-4 py-4 text-sm text-text-muted">
              Nada por aqui ainda. Quando curtirem ou comentarem algo seu, você vê primeiro nesse sino.
            </p>
          )}

          {/* A linha é uma div, não um button: a lixeira é um botão dentro dela, e botão
              dentro de botão não é permitido em HTML. */}
          {itens.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-2.5 px-3 py-2.5 hover:bg-card-subtle transition ${
                n.lida ? '' : 'bg-primary/5'
              }`}
            >
              <button
                onClick={() => abrirNotificacao(n)}
                className="flex-1 min-w-0 flex items-start gap-2.5 text-left"
              >
                {n.actor ? (
                  <Avatar name={n.actor.nickname || n.actor.name} avatarUrl={n.actor.avatarUrl} size={30} />
                ) : (
                  <span className="w-[30px] h-[30px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bell size={14} className="text-primary" />
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-text-main leading-snug">{n.message}</span>
                  <span className="block text-xs text-text-muted mt-0.5">{tempoAtras(n.createdAt)}</span>
                </span>
              </button>
              {!n.lida && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  apagar(n);
                }}
                className="shrink-0 p-1 -mr-1 text-text-muted/50 hover:text-red-600 transition"
                aria-label="Apagar aviso"
                title="Apagar aviso"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {itens.length > 0 && (
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={limparTudo}
                className="w-full text-center px-4 py-2 text-xs font-semibold text-text-muted hover:text-red-600 transition"
              >
                Limpar todos os avisos
              </button>
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
