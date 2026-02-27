import type { CellValue } from './dataUtils';
import { toNumeric } from './dataUtils';

export interface BinEntry {
  label: string;
  count: number;
  rangeMin: number;
  rangeMax: number;
}

export interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  q1: number;
  q3: number;
  count: number;
  nullCount: number;
}

export interface CategoricalStats {
  counts: Map<string, number>;
  total: number;
  nullCount: number;
  uniqueCount: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function computeNumericStats(values: CellValue[]): NumericStats {
  const nums: number[] = [];
  let nullCount = 0;
  for (const v of values) {
    const n = toNumeric(v);
    if (n === null) nullCount++;
    else nums.push(n);
  }
  if (nums.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0, q1: 0, q3: 0, count: 0, nullCount };
  }
  nums.sort((a, b) => a - b);
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return {
    min: nums[0],
    max: nums[nums.length - 1],
    mean,
    median: percentile(nums, 50),
    stdDev: Math.sqrt(variance),
    q1: percentile(nums, 25),
    q3: percentile(nums, 75),
    count: nums.length,
    nullCount,
  };
}

export function computeNumericBins(values: CellValue[], binCount = 20): BinEntry[] {
  return computeNumericBinsCustom(values, binCount);
}

export function computeNumericBinsCustom(values: CellValue[], binCount: number): BinEntry[] {
  const nums: number[] = [];
  for (const v of values) {
    const n = toNumeric(v);
    if (n !== null) nums.push(n);
  }
  if (nums.length === 0) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) {
    return [{ label: String(min), count: nums.length, rangeMin: min, rangeMax: max }];
  }
  const step = (max - min) / binCount;
  const bins: BinEntry[] = Array.from({ length: binCount }, (_, i) => {
    const lo = min + i * step;
    const hi = lo + step;
    return {
      label: `${lo.toFixed(2)}`,
      count: 0,
      rangeMin: lo,
      rangeMax: hi,
    };
  });
  for (const n of nums) {
    let idx = Math.floor((n - min) / step);
    if (idx >= binCount) idx = binCount - 1;
    bins[idx].count++;
  }
  return bins;
}

export function computeCategoricalStats(values: CellValue[]): CategoricalStats {
  const counts = new Map<string, number>();
  let nullCount = 0;
  for (const v of values) {
    if (v === null || v === '') {
      nullCount++;
      const k = '(empty)';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    } else {
      const k = String(v);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return { counts, total: values.length, nullCount, uniqueCount: counts.size };
}
