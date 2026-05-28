export function asText(value: any, fallback = '-'): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function amount(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toCurrency(value: any): string {
  const num = amount(value);
  return `KES ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
