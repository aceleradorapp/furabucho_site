import { Crown, Flag, LayoutGrid, Settings2, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { PageLoader } from '../components/PageLoader';
import { PrivateLayout } from '../components/PrivateLayout';
import { PontaFirmeBalancoTab } from '../components/pontaFirme/PontaFirmeBalancoTab';
import { PontaFirmeEventPayersTab } from '../components/pontaFirme/PontaFirmeEventPayersTab';
import type { EventPayer } from '../components/pontaFirme/PontaFirmeEventPayerModal';
import { PontaFirmeExpensesTab, type ExpenseCard } from '../components/pontaFirme/PontaFirmeExpensesTab';
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

interface ExpensesData {
  cards: ExpenseCard[];
  totalGastos: number;
}

interface EventPayersData {
  payers: EventPayer[];
  totalArrecadadoEvento: number;
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
  const [activeTab, setActiveTab] = useState<'pagamentos' | 'gastos' | 'pagantes' | 'balanco'>('pagamentos');
  const [data, setData] = useState<SeasonData | null>(null);
  const [expensesData, setExpensesData] = useState<ExpensesData | null>(null);
  const [eventPayersData, setEventPayersData] = useState<EventPayersData | null>(null);
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

  const loadExpenses = useCallback(() => {
    if (!activeSeasonId) return;
    api.get<ExpensesData>(`/ponta-firme/seasons/${activeSeasonId}/expenses`).then(setExpensesData);
  }, [activeSeasonId]);

  const loadEventPayers = useCallback(() => {
    if (!activeSeasonId) return;
    api.get<EventPayersData>(`/ponta-firme/seasons/${activeSeasonId}/event-payers`).then(setEventPayersData);
  }, [activeSeasonId]);

  useEffect(() => {
    loadData();
    loadExpenses();
    loadEventPayers();
  }, [loadData, loadExpenses, loadEventPayers]);

  function handleChanged() {
    loadData();
  }

  const totalArrecadadoGeral = (data?.totalArrecadado ?? 0) + (eventPayersData?.totalArrecadadoEvento ?? 0);
  const saldo = totalArrecadadoGeral - (expensesData?.totalGastos ?? 0);

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

        {!data && <PageLoader />}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-5">
              <div className="bg-card border border-border rounded-2xl p-2.5 sm:p-3.5 min-w-0">
                <p className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-wide truncate">Arrecadado</p>
                <p className="text-xs sm:text-lg font-bold text-text-main leading-tight break-words">
                  {formatMoney(totalArrecadadoGeral)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-2.5 sm:p-3.5 min-w-0">
                <p className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-wide truncate">Gastos</p>
                <p className="text-xs sm:text-lg font-bold text-text-main leading-tight break-words">
                  {formatMoney(expensesData?.totalGastos ?? 0)}
                </p>
              </div>
              <div
                className={`rounded-2xl p-2.5 sm:p-3.5 border min-w-0 ${
                  saldo >= 0
                    ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30'
                    : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                }`}
              >
                <p
                  className={`text-[9px] sm:text-[10px] uppercase tracking-wide truncate ${saldo >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  Saldo
                </p>
                <p
                  className={`text-xs sm:text-lg font-bold leading-tight break-words ${saldo >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {formatMoney(saldo)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto mb-5 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex items-center gap-1 bg-card-subtle rounded-full p-1 w-fit">
                <button
                  onClick={() => setActiveTab('pagamentos')}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    activeTab === 'pagamentos' ? 'bg-card shadow-sm text-text-main' : 'text-text-muted'
                  }`}
                >
                  Pagamentos
                </button>
                <button
                  onClick={() => setActiveTab('gastos')}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    activeTab === 'gastos' ? 'bg-card shadow-sm text-text-main' : 'text-text-muted'
                  }`}
                >
                  Gastos
                </button>
                <button
                  onClick={() => setActiveTab('pagantes')}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    activeTab === 'pagantes' ? 'bg-card shadow-sm text-text-main' : 'text-text-muted'
                  }`}
                >
                  Pagantes
                </button>
                <button
                  onClick={() => setActiveTab('balanco')}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    activeTab === 'balanco' ? 'bg-card shadow-sm text-text-main' : 'text-text-muted'
                  }`}
                >
                  Balanço
                </button>
              </div>
            </div>

            {activeTab === 'balanco' ? (
              <PontaFirmeBalancoTab
                totalArrecadado={data.totalArrecadado}
                totalArrecadadoEvento={eventPayersData?.totalArrecadadoEvento ?? 0}
                totalGastos={expensesData?.totalGastos ?? 0}
                expenseCards={expensesData?.cards ?? []}
              />
            ) : activeTab === 'pagantes' ? (
              <PontaFirmeEventPayersTab
                seasonId={data.season.id}
                payers={eventPayersData?.payers ?? []}
                canManage={canManage}
                onChanged={loadEventPayers}
              />
            ) : activeTab === 'gastos' ? (
              <PontaFirmeExpensesTab
                seasonId={data.season.id}
                cards={expensesData?.cards ?? []}
                canManage={canManage}
                onChanged={loadExpenses}
              />
            ) : (
              <>
                <div className="flex justify-end mb-3">
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
                              {p.removedAt && (
                                <span className="ml-1.5 text-[10px] text-red-500 font-normal">removido</span>
                              )}
                              {!p.isClaimed && (
                                <span className="ml-1.5 text-[10px] text-amber-600 font-normal">sem cadastro</span>
                              )}
                            </p>
                            <p className="text-xs text-text-muted">
                              {p.monthsPaid}/12 meses · {formatMoney(p.totalPaid)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 rounded-full bg-card-subtle overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <Flag size={13} className="text-text-muted shrink-0" />
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
          </>
        )}
      </div>

      {canManage && (
        <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
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
