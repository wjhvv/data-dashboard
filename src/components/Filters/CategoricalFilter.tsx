import { useState, useMemo } from 'react';
import type { CategoricalFilter as CategoricalFilterType } from '../../hooks/useDataStore';
import type { CategoricalStats } from '../../utils/histogramBinner';
import { SearchIcon, XIcon } from '../icons';

interface Props {
  stats: CategoricalStats;
  filter: CategoricalFilterType;
  onChange: (f: CategoricalFilterType) => void;
}

export function CategoricalFilter({ stats, filter, onChange }: Props) {
  const [search, setSearch] = useState('');

  const sortedEntries = useMemo(() => {
    const entries = Array.from(stats.counts.entries());
    const allNumeric = entries.length > 0 &&
      entries.every(([k]) => k === '(empty)' || !isNaN(Number(k)));
    if (allNumeric) {
      return entries.sort((a, b) => {
        if (a[0] === '(empty)') return 1;
        if (b[0] === '(empty)') return -1;
        return Number(a[0]) - Number(b[0]);
      });
    }
    return entries.sort((a, b) => b[1] - a[1]);
  }, [stats.counts]);

  const allKeys = useMemo(() => sortedEntries.map(([k]) => k), [sortedEntries]);

  const filtered = useMemo(() => {
    if (!search) return sortedEntries;
    const q = search.toLowerCase();
    return sortedEntries.filter(([k]) => k.toLowerCase().includes(q));
  }, [sortedEntries, search]);

  // No filter active = all items "checked" (Excel style)
  const noFilter = filter.selected.size === 0;
  const isChecked = (key: string) => noFilter || filter.selected.has(key);

  const toggle = (key: string) => {
    if (noFilter) {
      // First interaction: initialise with all except this key
      const next = new Set(allKeys);
      next.delete(key);
      onChange({ type: 'categorical', selected: next.size > 0 ? next : new Set() });
    } else {
      const next = new Set(filter.selected);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      // If all keys are now checked, clear filter
      onChange({ type: 'categorical', selected: next.size === allKeys.length ? new Set() : next });
    }
  };

  // Select all visible → if that means all, clear filter
  const selectAll = () => {
    const visibleKeys = new Set(filtered.map(([k]) => k));
    if (noFilter) return; // already all selected
    const next = new Set([...filter.selected, ...visibleKeys]);
    onChange({ type: 'categorical', selected: next.size === allKeys.length ? new Set() : next });
  };

  // Deselect all visible
  const deselectAll = () => {
    const visibleKeys = new Set(filtered.map(([k]) => k));
    if (noFilter) {
      // Start from all, remove visible
      const next = new Set(allKeys.filter((k) => !visibleKeys.has(k)));
      onChange({ type: 'categorical', selected: next });
    } else {
      const next = new Set([...filter.selected].filter((k) => !visibleKeys.has(k)));
      onChange({ type: 'categorical', selected: next });
    }
  };

  const showSearch = sortedEntries.length >= 10;
  const activeCount = noFilter ? allKeys.length : filter.selected.size;

  return (
    <div className="space-y-1.5 text-sm">
      {showSearch && (
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search values..."
            className="w-full pl-7 pr-7 py-1 border rounded text-xs"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
              <XIcon size={12} />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{activeCount} / {allKeys.length} selected</span>
        <div className="flex gap-2 text-blue-600">
          <button type="button" onClick={selectAll} className="hover:underline cursor-pointer">All</button>
          <button type="button" onClick={deselectAll} className="hover:underline cursor-pointer">None</button>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {filtered.map(([key, count]) => (
          <label key={key} className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={isChecked(key)}
              onChange={() => toggle(key)}
              className="rounded"
            />
            <span className="flex-1 truncate text-xs">{key}</span>
            <span className="text-gray-400 text-xs">{count}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <div className="text-gray-400 text-xs px-1">No matches</div>
        )}
      </div>
    </div>
  );
}
