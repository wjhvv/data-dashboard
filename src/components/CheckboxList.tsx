import { useState } from 'react';
import { SearchIcon, XIcon } from './icons';

export interface CheckboxListItem {
  key: string;
  label?: string;
  count?: number;
}

interface Props {
  items: CheckboxListItem[];
  isChecked: (key: string) => boolean;
  onToggle: (key: string) => void;
  /** Called with the currently-visible (post-search) keys */
  onAll: (visibleKeys: string[]) => void;
  onNone: (visibleKeys: string[]) => void;
  activeCount: number;
  totalCount: number;
  /** Right-side label after the count, e.g. "visible" or "selected" */
  countLabel: string;
  showSearch?: boolean;
  maxHeight?: string;
}

export function CheckboxList({
  items,
  isChecked,
  onToggle,
  onAll,
  onNone,
  activeCount,
  totalCount,
  countLabel,
  showSearch = true,
  maxHeight = 'max-h-48',
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? items.filter((item) => (item.label ?? item.key).toLowerCase().includes(search.toLowerCase()))
    : items;

  const visibleKeys = filtered.map((item) => item.key);

  return (
    <div className="space-y-1.5">
      {showSearch && (
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-7 pr-7 py-1 border rounded text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <XIcon size={12} />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs px-0.5">
        <span className="text-gray-400">{activeCount} / {totalCount} {countLabel}</span>
        <div className="flex gap-2 text-blue-600">
          <button type="button" onClick={() => onAll(visibleKeys)} className="hover:underline cursor-pointer">All</button>
          <button type="button" onClick={() => onNone(visibleKeys)} className="hover:underline cursor-pointer">None</button>
        </div>
      </div>

      <div className={`${maxHeight} overflow-y-auto space-y-0.5`}>
        {filtered.map((item) => (
          <label key={item.key} className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={isChecked(item.key)}
              onChange={() => onToggle(item.key)}
              className="rounded"
            />
            <span className="flex-1 truncate text-xs">{item.label ?? item.key}</span>
            {item.count !== undefined && (
              <span className="text-gray-400 text-xs">{item.count}</span>
            )}
          </label>
        ))}
        {filtered.length === 0 && (
          <div className="text-gray-400 text-xs px-1">No matches</div>
        )}
      </div>
    </div>
  );
}
