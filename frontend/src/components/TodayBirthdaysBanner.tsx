import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Avatar } from './Avatar';

interface BirthdayUser {
  id: number;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
  day: number;
  month: number;
}

function todayKey() {
  const d = new Date();
  return `fb_birthdays_dismissed_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function joinNames(names: string[]) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

export function TodayBirthdaysBanner() {
  const [todayUsers, setTodayUsers] = useState<BirthdayUser[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api
      .get<BirthdayUser[]>('/birthdays')
      .then((users) => {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        setTodayUsers(users.filter((u) => u.month === month && u.day === day));
      })
      .catch(() => {});

    try {
      setDismissed(localStorage.getItem(todayKey()) === '1');
    } catch {
      // ignora — sem persistencia nesse navegador
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(todayKey(), '1');
    } catch {
      // ignora
    }
  }

  if (dismissed || todayUsers.length === 0) return null;

  const names = todayUsers.map((u) => u.nickname || u.name);
  const isPlural = todayUsers.length > 1;

  return (
    <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 border-b border-primary/20">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex -space-x-2 shrink-0">
          {todayUsers.slice(0, 4).map((u) => (
            <div key={u.id} className="ring-2 ring-white rounded-full">
              <Avatar name={u.name} avatarUrl={u.avatarUrl} size={32} />
            </div>
          ))}
        </div>
        <p className="text-sm text-text-main flex-1 min-w-0">
          <span className="mr-1">🎉</span>
          {isPlural ? 'Hoje são aniversários de' : 'Hoje é aniversário de'}{' '}
          <strong className="font-semibold">{joinNames(names)}</strong>! Manda um parabéns 🎂
        </p>
        <button
          onClick={handleDismiss}
          className="text-text-muted hover:text-text-main transition shrink-0"
          aria-label="Fechar aviso"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
