/** Formata progressivamente um telefone BR no padrão (DD)NÚMERO, ex: (19)997230475. */
export function formatPhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  return `(${digits.slice(0, 2)})${digits.slice(2)}`;
}
