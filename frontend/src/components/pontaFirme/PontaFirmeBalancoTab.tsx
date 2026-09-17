import { Anchor, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';
import type { ExpenseCard } from './PontaFirmeExpensesTab';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PontaFirmeBalancoTab({
  totalArrecadado,
  totalArrecadadoEvento,
  totalGastos,
  expenseCards,
}: {
  totalArrecadado: number;
  totalArrecadadoEvento: number;
  totalGastos: number;
  expenseCards: ExpenseCard[];
}) {
  const totalGeralArrecadado = totalArrecadado + totalArrecadadoEvento;
  const saldoGeral = totalGeralArrecadado - totalGastos;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-2xl p-5 border ${
          saldoGeral >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Wallet size={16} className={saldoGeral >= 0 ? 'text-green-700' : 'text-red-600'} />
          <p className={`text-xs font-semibold uppercase tracking-wide ${saldoGeral >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            Saldo geral
          </p>
        </div>
        <p className={`text-3xl font-bold mt-1 ${saldoGeral >= 0 ? 'text-green-700' : 'text-red-600'}`}>
          {formatMoney(saldoGeral)}
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">De onde vem o dinheiro</h3>

        <div className="flex items-center justify-between py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Anchor size={15} className="text-primary" />
            <span className="text-sm text-text-main">Arrecadado com a Ponta Firme</span>
          </div>
          <span className="text-sm font-semibold text-green-700">+{formatMoney(totalArrecadado)}</span>
        </div>

        <div className="flex items-center justify-between py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-primary" />
            <span className="text-sm text-text-main">Arrecadado com pagamentos do evento</span>
          </div>
          <span className="text-sm font-semibold text-green-700">+{formatMoney(totalArrecadadoEvento)}</span>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-green-700" />
            <span className="text-sm font-semibold text-text-main">Total arrecadado</span>
          </div>
          <span className="text-sm font-bold text-green-700">{formatMoney(totalGeralArrecadado)}</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={15} className="text-red-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Gastos</h3>
        </div>

        {expenseCards.length === 0 ? (
          <p className="text-sm text-text-muted py-1">Nenhum gasto registrado ainda.</p>
        ) : (
          <div className="flex flex-col">
            {expenseCards.map((card) => (
              <div key={card.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-text-main">{card.title}</span>
                <span className="text-sm text-text-muted">-{formatMoney(card.total)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
          <span className="text-sm font-semibold text-text-main">Total gastos</span>
          <span className="text-sm font-bold text-red-600">-{formatMoney(totalGastos)}</span>
        </div>
      </div>

    </div>
  );
}
