import { useState, useEffect } from 'react';
import type { NumericFilter as NumericFilterType } from '../../hooks/useDataStore';
import type { NumericStats } from '../../utils/histogramBinner';
import { fmtNum } from '../../utils/dataUtils';

interface Props {
  colName: string;
  stats: NumericStats;
  filter: NumericFilterType;
  onChange: (f: NumericFilterType) => void;
}

export function NumericFilter({ stats, filter, onChange }: Props) {
  const [mode, setMode] = useState<'range' | 'exact'>('range');
  const [minStr, setMinStr] = useState(filter.min !== null ? String(filter.min) : '');
  const [maxStr, setMaxStr] = useState(filter.max !== null ? String(filter.max) : '');
  const [exactStr, setExactStr] = useState(filter.exact !== null ? String(filter.exact) : '');

  useEffect(() => {
    if (mode === 'range') {
      const min = minStr === '' ? null : Number(minStr);
      const max = maxStr === '' ? null : Number(maxStr);
      onChange({ type: 'numeric', min: isNaN(min as number) ? null : min, max: isNaN(max as number) ? null : max, exact: null });
    } else {
      const exact = exactStr === '' ? null : Number(exactStr);
      onChange({ type: 'numeric', min: null, max: null, exact: isNaN(exact as number) ? null : exact });
    }
  }, [mode, minStr, maxStr, exactStr]);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('range')}
          className={`px-2 py-0.5 rounded text-xs ${mode === 'range' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Range
        </button>
        <button
          type="button"
          onClick={() => setMode('exact')}
          className={`px-2 py-0.5 rounded text-xs ${mode === 'exact' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Exact
        </button>
      </div>

      {mode === 'range' ? (
        <div className="flex gap-1 items-center">
          <input
            type="number"
            value={minStr}
            onChange={(e) => setMinStr(e.target.value)}
            placeholder={`Min (${fmtNum(stats.min)})`}
            className="w-full border rounded px-2 py-1 text-xs"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            value={maxStr}
            onChange={(e) => setMaxStr(e.target.value)}
            placeholder={`Max (${fmtNum(stats.max)})`}
            className="w-full border rounded px-2 py-1 text-xs"
          />
        </div>
      ) : (
        <input
          type="number"
          value={exactStr}
          onChange={(e) => setExactStr(e.target.value)}
          placeholder="Exact value"
          className="w-full border rounded px-2 py-1 text-xs"
        />
      )}
    </div>
  );
}
