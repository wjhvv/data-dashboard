import { useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ColumnMeta, ColumnFilter } from '../../hooks/useDataStore';
import type { NumericStats, CategoricalStats } from '../../utils/histogramBinner';
import { FilterControl } from './FilterControl';
import { SearchIcon, XIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';

interface Props {
  columns: ColumnMeta[];
  columnStatsMap: Record<string, NumericStats | CategoricalStats>;
  filterMap: Record<string, ColumnFilter>;
  onFilterChange: (colName: string, filter: ColumnFilter | null) => void;
  onToggleType: (colName: string) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  sidebarWidth: number;
  onResizeStart: (e: ReactMouseEvent) => void;
}

export function FilterPanel({
  columns,
  columnStatsMap,
  filterMap,
  onFilterChange,
  onToggleType,
  sidebarOpen,
  onToggleSidebar,
  sidebarWidth,
  onResizeStart,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? columns.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : columns;

  const activeFilterCount = Object.values(filterMap).filter((f) =>
    f.type === 'numeric'
      ? f.min !== null || f.max !== null || f.exact !== null
      : f.selected !== null
  ).length;

  return (
    <>
      <aside
        className="flex flex-col bg-white border-r border-gray-200 overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? sidebarWidth : 0, minWidth: sidebarOpen ? sidebarWidth : 0 }}
      >
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded hover:bg-gray-100"
            title="Collapse sidebar"
          >
            <ChevronLeftIcon size={16} />
          </button>
        </div>

        {columns.length > 0 && (
          <div className="px-3 py-2 border-b border-gray-100 shrink-0">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search columns..."
                className="w-full pl-7 pr-7 py-1.5 border rounded text-xs"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  <XIcon size={12} />
                </button>
              )}
            </div>
            {search && (
              <div className="text-xs text-gray-400 mt-1">{filtered.length} / {columns.length} columns</div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 && columns.length === 0 && (
            <div className="text-gray-400 text-sm text-center mt-8">Upload a file to start</div>
          )}
          {filtered.map((col) => {
            const stats = columnStatsMap[col.name];
            if (!stats) return null;
            return (
              <FilterControl
                key={col.name}
                column={col}
                stats={stats}
                filter={filterMap[col.name]}
                onFilterChange={(f) => onFilterChange(col.name, f)}
                onToggleType={() => onToggleType(col.name)}
              />
            );
          })}
        </div>
      </aside>

      {/* Drag handle */}
      {sidebarOpen && (
        <div
          onMouseDown={onResizeStart}
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize shrink-0 transition-colors"
          title="Drag to resize"
        />
      )}

      {/* Collapsed toggle */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex items-center justify-center w-8 bg-white border-r border-gray-200 hover:bg-gray-50 cursor-pointer shrink-0"
          title="Expand sidebar"
        >
          <ChevronRightIcon size={16} className="text-gray-500" />
        </button>
      )}
    </>
  );
}
