import { useState, useMemo } from 'react';
import type { CategoricalStats } from '../../utils/histogramBinner';
import { ChevronUpIcon, ChevronDownIcon } from '../icons';

interface Props {
  stats: CategoricalStats;
}

type SortKey = 'value' | 'count' | 'pct';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

/** Return true if every non-empty key parses as a finite number */
function allNumeric(keys: string[]): boolean {
  const nonEmpty = keys.filter((k) => k !== '(empty)');
  if (nonEmpty.length === 0) return false;
  return nonEmpty.every((k) => isFinite(Number(k)));
}

export function CategoricalStatsTable({ stats }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const entries = useMemo(() => Array.from(stats.counts.entries()), [stats.counts]);
  const isNumericValues = useMemo(() => allNumeric(entries.map(([k]) => k)), [entries]);

  const sorted = useMemo(() => {
    const total = stats.total || 1;
    return [...entries]
      .map(([value, count]) => ({ value, count, pct: count / total }))
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'value') {
          cmp = isNumericValues
            ? Number(a.value) - Number(b.value)
            : a.value.localeCompare(b.value);
        } else if (sortKey === 'count') {
          cmp = a.count - b.count;
        } else {
          cmp = a.pct - b.pct;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [entries, sortKey, sortDir, isNumericValues, stats.total]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'value' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="w-3 inline-block" />;
    return sortDir === 'asc' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />;
  };

  const thClass = (col: SortKey) =>
    `px-3 py-2 text-left text-xs font-medium text-gray-500 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap ${
      sortKey === col ? 'text-blue-600' : ''
    }`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="text-xs w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className={thClass('value')} onClick={() => handleSort('value')}>
                <div className="flex items-center gap-1">
                  Value {isNumericValues && <span className="text-gray-400">#</span>}
                  <SortIcon col="value" />
                </div>
              </th>
              <th className={thClass('count')} onClick={() => handleSort('count')}>
                <div className="flex items-center gap-1">Count <SortIcon col="count" /></div>
              </th>
              <th className={thClass('pct')} onClick={() => handleSort('pct')}>
                <div className="flex items-center gap-1">% <SortIcon col="pct" /></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ value, count, pct }, i) => (
              <tr key={value} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-1.5 text-gray-700 max-w-[12rem] truncate">{value}</td>
                <td className="px-3 py-1.5 text-gray-700 tabular-nums">{count.toLocaleString()}</td>
                <td className="px-3 py-1.5 text-gray-700 tabular-nums">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${Math.round(pct * 100)}%` }}
                      />
                    </div>
                    <span>{(pct * 100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{sorted.length} unique values</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-0.5 border rounded bg-white disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
            >
              Prev
            </button>
            <span>{page + 1} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-0.5 border rounded bg-white disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
