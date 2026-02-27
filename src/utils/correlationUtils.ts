import type { CellValue } from './dataUtils';
import { toNumeric } from './dataUtils';

export function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return NaN;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i];
    sxy += xs[i] * ys[i];
    sx2 += xs[i] * xs[i];
    sy2 += ys[i] * ys[i];
  }
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
  return den === 0 ? 0 : num / den;
}

export function extractPairs(
  rows: CellValue[][],
  xIdx: number,
  yIdx: number,
): [number[], number[]] {
  const xs: number[] = [], ys: number[] = [];
  for (const row of rows) {
    const x = toNumeric(row[xIdx]);
    const y = toNumeric(row[yIdx]);
    if (x !== null && y !== null) { xs.push(x); ys.push(y); }
  }
  return [xs, ys];
}

export function computeCorrelationMatrix(
  rows: CellValue[][],
  colIndices: number[],
): number[][] {
  const n = colIndices.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(1));
  // Sample for performance on large datasets
  const sample = rows.length > 5000
    ? rows.filter((_, i) => i % Math.ceil(rows.length / 5000) === 0)
    : rows;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [xs, ys] = extractPairs(sample, colIndices[i], colIndices[j]);
      const r = pearson(xs, ys);
      matrix[i][j] = r;
      matrix[j][i] = r;
    }
  }
  return matrix;
}
