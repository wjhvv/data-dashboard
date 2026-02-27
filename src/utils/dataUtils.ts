export type CellValue = string | number | null;

export const EMPTY_LABEL = '(empty)';

export function toNumeric(v: CellValue): number | null {
  if (v === null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export function getCategoricalLabel(v: CellValue): string {
  if (v === null || v === '') return EMPTY_LABEL;
  return String(v);
}

export function fmtNum(n: number, decimals = 4): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(decimals).replace(/\.?0+$/, '');
}
