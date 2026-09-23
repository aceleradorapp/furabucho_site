import { Cake, PartyPopper, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Avatar } from '../components/Avatar';
import { PageLoader } from '../components/PageLoader';
import { PrivateLayout } from '../components/PrivateLayout';

interface BirthdayUser {
  id: number;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
  day: number;
  month: number;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function formatDayMonth(day: number, month: number) {
  return `${day} de ${MONTH_NAMES[month - 1]}`;
}

export function BirthdaysPage() {
  const [users, setUsers] = useState<BirthdayUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<BirthdayUser[]>('/birthdays').then(setUsers).finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const thisMonthUsers = useMemo(
    () => users.filter((u) => u.month === currentMonth).sort((a, b) => a.day - b.day),
    [users, currentMonth],
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => (monthFilter ? u.month === monthFilter : true))
      .filter((u) => (q ? u.name.toLowerCase().includes(q) || (u.nickname ?? '').toLowerCase().includes(q) : true));
  }, [users, monthFilter, search]);

  const groupedByMonth = useMemo(() => {
    const groups = new Map<number, BirthdayUser[]>();
    for (const u of filteredUsers) {
      const group = groups.get(u.month) ?? [];
      group.push(u);
      groups.set(u.month, group);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [filteredUsers]);

  return (
    <PrivateLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase tracking-wider text-2xl text-text-main mb-2 inline-flex items-center gap-2">
          <Cake size={24} className="text-primary" /> Aniversariantes
        </h1>
        <p className="text-sm text-text-muted mb-6">Confira quando é o aniversário de cada um da turma.</p>

        {thisMonthUsers.length > 0 && (
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5 mb-8">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-4 inline-flex items-center gap-1.5">
              <PartyPopper size={16} /> Aniversariantes de {MONTH_NAMES[currentMonth - 1]}
            </p>
            <div className="flex flex-wrap gap-4">
              {thisMonthUsers.map((u) => {
                const isToday = u.day === currentDay;
                return (
                  <div key={u.id} className="flex flex-col items-center gap-1.5 w-20 text-center">
                    <div className="relative">
                      <Avatar name={u.name} avatarUrl={u.avatarUrl} size={56} />
                      {isToday && (
                        <span className="absolute -top-1 -right-1 text-base" title="É hoje!">
                          🎉
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-text-main truncate w-full">{u.nickname || u.name}</p>
                    <p className="text-[11px] text-text-muted">{isToday ? 'Hoje!' : `dia ${u.day}`}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full rounded-full border border-border pl-9 pr-4 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setMonthFilter(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              monthFilter === null ? 'bg-primary text-white' : 'bg-card-subtle text-text-muted hover:text-text-main'
            }`}
          >
            Todos
          </button>
          {MONTH_NAMES.map((name, index) => (
            <button
              key={name}
              onClick={() => setMonthFilter(index + 1)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                monthFilter === index + 1 ? 'bg-primary text-white' : 'bg-card-subtle text-text-muted hover:text-text-main'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {loading ? (
          <PageLoader />
        ) : groupedByMonth.length === 0 ? (
          <p className="text-sm text-text-muted py-10 text-center">Nenhum aniversariante encontrado.</p>
        ) : (
          <div className="flex flex-col gap-8">
            {groupedByMonth.map(([month, group]) => (
              <div key={month}>
                {monthFilter === null && (
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                    {MONTH_NAMES[month - 1]}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {group.map((u) => {
                    const isToday = u.month === currentMonth && u.day === currentDay;
                    return (
                      <div
                        key={u.id}
                        className={`flex items-center gap-3 bg-card border rounded-2xl p-3 transition ${
                          isToday ? 'border-primary ring-1 ring-primary' : 'border-border'
                        }`}
                      >
                        <Avatar name={u.name} avatarUrl={u.avatarUrl} size={44} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-main truncate">{u.nickname || u.name}</p>
                          {u.nickname && <p className="text-xs text-text-muted truncate">{u.name}</p>}
                        </div>
                        <span
                          className={`text-xs font-semibold shrink-0 ${isToday ? 'text-primary' : 'text-text-muted'}`}
                        >
                          {isToday ? '🎉 Hoje!' : formatDayMonth(u.day, u.month)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PrivateLayout>
  );
}
