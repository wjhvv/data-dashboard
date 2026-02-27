import { useState } from 'react';
import type { ColumnMeta } from '../../hooks/useDataStore';
import type { NumericStats, CategoricalStats } from '../../utils/histogramBinner';
import { ChevronUpIcon, ChevronDownIcon } from '../icons';

interface Props {
  columns: ColumnMeta[];
  columnStatsMap: Record<string, NumericStats | CategoricalStats>;
}

type SortKey = 'name' | 'type' | 'count' | 'nullCount' | 'mean' | 'stdDev' | 'min' | 'q1' | 'median' | 'q3' | 'max' | 'unique';
type SortDir = 'asc' | 'desc';

function isNumericStats(s: NumericStats | CategoricalStats): s is NumericStats {
  return 'mean' in s;
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toPrecision(4);
}

const NUM_COLS: { key: SortKey; label: string }[] = [
  { key: 'count', label: 'Count' },
  { key: 'nullCount', label: 'Nulls' },
  { key: 'mean', label: 'Mean' },
  { key: 'stdDev', label: 'Std Dev' },
  { key: 'min', label: 'Min' },
  { key: 'q1', label: 'Q1' },
  { key: 'median', label: 'Median' },
  { key: 'q3', label: 'Q3' },
  { key: 'max', label: 'Max' },
];


export function AllStatsTable({ columns, columnStatsMap }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [typeFilter, setTypeFilter] = useState<'all' | 'numeric' | 'categorical'>('all');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const getValue = (col: ColumnMeta, key: SortKey): number | string => {
    const s = columnStatsMap[col.name];
    if (!s) return '';
    if (key === 'name') return col.name;
    if (key === 'type') return col.type;
    if (key === 'unique') return isNumericStats(s) ? -1 : s.uniqueCount;
    if (isNumericStats(s)) {
      const map: Record<string, number> = {
        count: s.count, nullCount: s.nullCount, mean: s.mean,
        stdDev: s.stdDev, min: s.min, q1: s.q1, median: s.median, q3: s.q3, max: s.max,
      };
      return map[key] ?? '';
    } else {
      if (key === 'count') return s.total;
      if (key === 'nullCount') return s.nullCount;
      return '';
    }
  };

  const filtered = columns.filter((c) =>
    typeFilter === 'all' || c.type === typeFilter
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = getValue(a, sortKey);
    const bv = getValue(b, sortKey);
    let cmp = 0;
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="text-gray-300 ml-0.5">↕</span>;
    return sortDir === 'asc'
      ? <ChevronUpIcon size={11} className="inline ml-0.5" />
      : <ChevronDownIcon size={11} className="inline ml-0.5" />;
  };

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(k)}
      className="px-2 py-2 text-left text-xs font-medium text-gray-600 whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none border-b border-gray-200"
    >
      {children}<SortIcon k={k} />
    </th>
  );

  const showNumeric = typeFilter !== 'categorical';
  const showCat = typeFilter !== 'numeric';

  return (
    <div className="space-y-2">
      {/* Type filter */}
      <div className="flex gap-2 text-xs">
        {(['all', 'numeric', 'categorical'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`px-2.5 py-1 rounded-full border cursor-pointer capitalize ${
              typeFilter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t === 'all' ? `All (${columns.length})` : `${t === 'numeric' ? 'Numeric' : 'Categorical'} (${columns.filter((c) => c.type === t).length})`}
          </button>
        ))}
      </div>

      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="text-xs w-full border-collapse bg-white">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <Th k="name">Column</Th>
              <Th k="type">Type</Th>
              <Th k="count">Count</Th>
              <Th k="nullCount">Nulls</Th>
              {showNumeric && NUM_COLS.slice(2).map(({ key, label }) => (
                <Th key={key} k={key}>{label}</Th>
              ))}
              {showCat && typeFilter === 'categorical' && (
                <Th k="unique">Unique</Th>
              )}
              {typeFilter === 'all' && <Th k="unique">Unique</Th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((col, ri) => {
              const s = columnStatsMap[col.name];
              if (!s) return null;
              const isNum = isNumericStats(s);
              return (
                <tr key={col.name} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1.5 font-medium text-gray-800 truncate max-w-40">{col.name}</td>
                  <td className="px-2 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${isNum ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {isNum ? 'Num' : 'Cat'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 tabular-nums text-right">{isNum ? s.count.toLocaleString() : s.total.toLocaleString()}</td>
                  <td className="px-2 py-1.5 tabular-nums text-right">{s.nullCount.toLocaleString()}</td>
                  {showNumeric && NUM_COLS.slice(2).map(({ key }) => (
                    <td key={key} className="px-2 py-1.5 tabular-nums text-right text-gray-600">
                      {isNum ? fmt((s as NumericStats)[key as keyof NumericStats] as number) : '—'}
                    </td>
                  ))}
                  {(typeFilter === 'all' || typeFilter === 'categorical') && (
                    <td className="px-2 py-1.5 tabular-nums text-right text-gray-600">
                      {isNum ? '—' : (s as CategoricalStats).uniqueCount.toLocaleString()}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
