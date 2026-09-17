import { Crown, Flag, LayoutGrid, Settings2, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { PrivateLayout } from '../components/PrivateLayout';
import { PontaFirmeFullTableModal } from '../components/pontaFirme/PontaFirmeFullTableModal';
import { PontaFirmeManagePanel } from '../components/pontaFirme/PontaFirmeManagePanel';
import { PontaFirmePayerModal, type Payer } from '../components/pontaFirme/PontaFirmePayerModal';

interface Season {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface SeasonData {
  season: { id: number; label: string; startDate: string; endDate: string };
  months: string[];
  payers: Payer[];
  totalArrecadado: number;
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const RANK_STYLES = [
  { bg: 'bg-[#FFD54A]', text: 'text-black' },
  { bg: 'bg-[#C7CDD6]', text: 'text-black' },
  { bg: 'bg-[#D69A5C]', text: 'text-white' },
];

export function PontaFirmePage() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || !!user?.permissions['pontaFirme.manage'];

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [data, setData] = useState<SeasonData | null>(null);
  const [selectedPayer, setSelectedPayer] = useState<Payer | null>(null);
  const [showFullTable, setShowFullTable] = useState(false);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    api.get<Season[]>('/ponta-firme/seasons').then((list) => {
      setSeasons(list);
      const current = list.find((s) => s.isCurrent) ?? list[0];
      if (current) setActiveSeasonId(current.id);
    });
  }, []);

  const loadData = useCallback(() => {
    if (!activeSeasonId) return;
    api.get<SeasonData>(`/ponta-firme/seasons/${activeSeasonId}/data`).then(setData);
  }, [activeSeasonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleChanged() {
    loadData();
  }

  return (
    <PrivateLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Trophy size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="font-display uppercase tracking-wider text-2xl text-text-main">Ponta Firme</h1>
            <p className="text-sm text-text-muted">Ranking de quem tá em dia com os pagamentos mensais da festa.</p>
          </div>
        </div>

        {seasons.length > 0 && (
          <div className="flex items-center gap-2 mt-6 mb-4">
            {seasons.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSeasonId(s.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  activeSeasonId === s.id
                    ? 'bg-primary text-white'
                    : 'bg-card-subtle text-text-muted hover:text-text-main'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="bg-card border border-border rounded-2xl p-5 mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Total arrecadado</p>
                <p className="text-2xl font-bold text-text-main">{formatMoney(data.totalArrecadado)}</p>
              </div>
              <button
                onClick={() => setShowFullTable(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition rounded-full border border-border px-3 py-2"
              >
                <LayoutGrid size={14} /> Ver tabela completa
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {data.payers.map((p, index) => {
                const pct = Math.min(100, (p.monthsPaid / 12) * 100);
                const rankStyle = RANK_STYLES[index];

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPayer(p)}
                    className={`text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition ${
                      p.removedAt ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          rankStyle ? `${rankStyle.bg} ${rankStyle.text}` : 'bg-card-subtle text-text-muted'
                        }`}
                      >
                        {index === 0 ? <Crown size={13} /> : index + 1}
                      </div>
                      <Avatar name={p.name} avatarUrl={p.avatarUrl} size={34} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-main truncate">
                          {p.name}
                          {p.removedAt && <span className="ml-1.5 text-[10px] text-red-500 font-normal">removido</span>}
                          {!p.isClaimed && (
                            <span className="ml-1.5 text-[10px] text-amber-600 font-normal">sem cadastro</span>
                          )}
                        </p>
                        <p className="text-xs text-text-muted">
                          {p.monthsPaid}/12 meses · {formatMoney(p.totalPaid)}
                        </p>
                      </div>
                    </div>

                    <div className="relative h-2.5 rounded-full bg-card-subtle overflow-visible">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <Flag
                        size={14}
                        className="absolute -right-0.5 -top-[3px] text-text-muted"
                        style={{ transform: 'translateX(50%)' }}
                      />
                    </div>
                  </button>
                );
              })}

              {data.payers.length === 0 && (
                <p className="text-sm text-text-muted text-center py-10">Nenhum integrante ainda.</p>
              )}
            </div>
          </>
        )}
      </div>

      {canManage && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border">
          <div className="max-w-3xl mx-auto px-4 py-3 flex justify-end">
            <button
              onClick={() => setShowManage(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-5 py-2.5 transition"
            >
              <Settings2 size={16} /> Gerenciar integrantes
            </button>
          </div>
        </div>
      )}

      {selectedPayer && (
        <PontaFirmePayerModal
          payer={selectedPayer}
          canManage={canManage}
          open={!!selectedPayer}
          onOpenChange={(open) => !open && setSelectedPayer(null)}
          onChanged={() => {
            loadData();
            setSelectedPayer(null);
          }}
        />
      )}

      {data && (
        <PontaFirmeFullTableModal
          payers={data.payers}
          seasonLabel={data.season.label}
          open={showFullTable}
          onOpenChange={setShowFullTable}
        />
      )}

      {data && canManage && (
        <PontaFirmeManagePanel
          seasonId={data.season.id}
          payers={data.payers}
          open={showManage}
          onOpenChange={setShowManage}
          onChanged={handleChanged}
        />
      )}
    </PrivateLayout>
  );
}
