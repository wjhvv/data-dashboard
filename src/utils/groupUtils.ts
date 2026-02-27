import type { CellValue } from './dataUtils';
import { toNumeric } from './dataUtils';

export const GROUP_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export const MAX_GROUPS = 8;

/** Split rows into groups by a column's values; collapse rare groups into "Others" */
export function splitByGroup(
  rows: CellValue[][],
  colIdx: number,
  maxGroups = MAX_GROUPS,
): Record<string, CellValue[][]> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const v = row[colIdx];
    const key = v === null || v === '' ? '(empty)' : String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const topGroups = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxGroups)
    .map(([k]) => k);
  const topSet = new Set(topGroups);

  const map: Record<string, CellValue[][]> = {};
  for (const g of topGroups) map[g] = [];

  for (const row of rows) {
    const v = row[colIdx];
    const key = v === null || v === '' ? '(empty)' : String(v);
    if (topSet.has(key)) {
      map[key].push(row);
    } else {
      map['Others'] ??= [];
      map['Others'].push(row);
    }
  }
  return map;
}

export interface GroupedHistogramRow {
  label: string;
  rangeMin: number;
  rangeMax: number;
  [group: string]: number | string;
}

/** Compute side-by-side histogram data with shared bin edges */
export function computeGroupedHistogramData(
  groupedRowsMap: Record<string, CellValue[][]>,
  colIdx: number,
  binCount: number,
): GroupedHistogramRow[] {
  const allNums: number[] = [];
  for (const rows of Object.values(groupedRowsMap)) {
    for (const row of rows) {
      const n = toNumeric(row[colIdx]);
      if (n !== null) allNums.push(n);
    }
  }
  if (allNums.length === 0) return [];
  const min = Math.min(...allNums);
  const max = Math.max(...allNums);
  if (min === max) return [];

  const step = (max - min) / binCount;
  const result: GroupedHistogramRow[] = Array.from({ length: binCount }, (_, i) => ({
    label: (min + i * step).toFixed(2),
    rangeMin: min + i * step,
    rangeMax: min + (i + 1) * step,
  }));

  for (const [groupName, rows] of Object.entries(groupedRowsMap)) {
    for (let i = 0; i < binCount; i++) result[i][groupName] = 0;
    for (const row of rows) {
      const n = toNumeric(row[colIdx]);
      if (n === null) continue;
      let idx = Math.floor((n - min) / step);
      if (idx >= binCount) idx = binCount - 1;
      (result[idx][groupName] as number)++;
    }
  }
  return result;
}

export interface GroupedCategoricalRow {
  label: string;
  [group: string]: number | string;
}

/** Compute grouped bar data for a categorical column (top N values by total count) */
export function computeGroupedCategoricalData(
  groupedRowsMap: Record<string, CellValue[][]>,
  colIdx: number,
  topN = 15,
): GroupedCategoricalRow[] {
  const totalCounts = new Map<string, number>();
  for (const rows of Object.values(groupedRowsMap)) {
    for (const row of rows) {
      const v = row[colIdx];
      const key = v === null || v === '' ? '(empty)' : String(v);
      totalCounts.set(key, (totalCounts.get(key) ?? 0) + 1);
    }
  }
  const topValues = [...totalCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([k]) => k);

  return topValues.map((val) => {
    const row: GroupedCategoricalRow = { label: val };
    for (const [g, rows] of Object.entries(groupedRowsMap)) {
      row[g] = rows.filter((r) => {
        const v = r[colIdx];
        return (v === null || v === '' ? '(empty)' : String(v)) === val;
      }).length;
    }
    return row;
  });
}
