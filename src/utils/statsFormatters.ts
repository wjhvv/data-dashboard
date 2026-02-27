import { fmtNum } from './dataUtils';
import type { NumericStats, CategoricalStats } from './histogramBinner';

export interface StatItem {
  label: string;
  value: string;
}

export function getNumericStatItems(stats: NumericStats): StatItem[] {
  return [
    { label: 'Count', value: String(stats.count) },
    { label: 'Null', value: String(stats.nullCount) },
    { label: 'Min', value: fmtNum(stats.min) },
    { label: 'Max', value: fmtNum(stats.max) },
    { label: 'Mean', value: fmtNum(stats.mean) },
    { label: 'Median', value: fmtNum(stats.median) },
    { label: 'Std Dev', value: fmtNum(stats.stdDev) },
    { label: 'Q1', value: fmtNum(stats.q1) },
    { label: 'Q3', value: fmtNum(stats.q3) },
  ];
}

export function getCategoricalStatItems(stats: CategoricalStats): StatItem[] {
  return [
    { label: 'Total', value: String(stats.total) },
    { label: 'Null', value: String(stats.nullCount) },
    { label: 'Unique', value: String(stats.uniqueCount) },
  ];
}
