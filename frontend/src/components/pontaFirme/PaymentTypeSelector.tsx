export type PaymentType = 'inteiro' | 'meio' | 'nao_paga';

export const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'inteiro', label: 'Inteiro' },
  { value: 'meio', label: 'Meio' },
  { value: 'nao_paga', label: 'Não paga' },
];

export function paymentTypeMultiplier(type: PaymentType): number {
  if (type === 'meio') return 0.5;
  if (type === 'nao_paga') return 0;
  return 1;
}

export function PaymentTypeSelector({
  value,
  onChange,
}: {
  value: PaymentType;
  onChange: (value: PaymentType) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 bg-card-subtle rounded-full p-0.5 shrink-0">
      {PAYMENT_TYPE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1 rounded-full text-[10px] font-semibold transition whitespace-nowrap ${
            value === opt.value ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
