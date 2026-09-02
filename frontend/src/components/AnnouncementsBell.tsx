import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Megaphone, Trash2, X } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UPLOADS_BASE } from '../lib/config';

export interface AnnouncementItem {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  link: string | null;
  scheduledAt: string;
  viewed: boolean;
}

export function AnnouncementBellButton({
  announcements,
  open,
  onOpenChange,
  onSelect,
  onDelete,
  canManage,
  className,
  iconSize = 22,
}: {
  announcements: AnnouncementItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (a: AnnouncementItem) => void;
  onDelete: (id: number) => void;
  canManage: boolean;
  className: string;
  iconSize?: number;
}) {
  const unseenCount = announcements.filter((a) => !a.viewed).length;

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button className={className} aria-label="Novidades">
          <span className="relative inline-flex">
            <Megaphone size={iconSize} />
            {unseenCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">
                {unseenCount}
              </span>
            )}
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="bg-card rounded-xl shadow-2xl border border-border py-2 w-72 max-h-96 overflow-y-auto z-40"
        >
          <p className="px-4 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Novidades</p>
          {announcements.length === 0 && (
            <p className="px-4 py-3 text-sm text-text-muted">Nenhuma novidade por aqui.</p>
          )}
          {announcements.map((a) => (
            <div
              key={a.id}
              onClick={() => {
                onSelect(a);
                onOpenChange(false);
              }}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-card-subtle cursor-pointer"
            >
              <img
                src={`${UPLOADS_BASE}${a.imageUrl}`}
                alt=""
                className="w-8 h-11 object-cover rounded-md shrink-0 bg-black/5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-main truncate">{a.title}</p>
                {!a.viewed && <span className="text-[10px] text-primary font-semibold">novo</span>}
              </div>
              {canManage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(a.id);
                  }}
                  className="text-text-muted hover:text-red-600 p-1 shrink-0 transition"
                  aria-label="Excluir novidade"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function AnnouncementFullscreenViewer({
  announcement,
  onClose,
}: {
  announcement: AnnouncementItem;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleMediaClick() {
    if (!announcement.link) return;
    const link = announcement.link;
    onClose();
    if (/^https?:\/\//.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      navigate(link);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-10"
      onClick={onClose}
    >
      <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-11 right-0 sm:-top-3 sm:-right-3 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition z-10"
          aria-label="Fechar"
        >
          <X size={22} />
        </button>
        <img
          src={`${UPLOADS_BASE}${announcement.imageUrl}`}
          alt={announcement.title}
          onClick={handleMediaClick}
          className={`w-full h-auto max-h-[88vh] object-contain rounded-2xl bg-black shadow-2xl ${announcement.link ? 'cursor-pointer' : ''}`}
        />
      </div>
    </div>
  );
}
