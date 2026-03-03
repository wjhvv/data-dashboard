import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CellValue } from '../../utils/dataUtils';
import type { ColumnMeta, ColumnFilter, NumericFilter as NumericFilterType, CategoricalFilter as CategoricalFilterType } from '../../hooks/useDataStore';
import type { NumericStats, CategoricalStats } from '../../utils/histogramBinner';
import { ChevronUpIcon, ChevronDownIcon, ColumnsIcon, DownloadIcon, XIcon, ExpandIcon, FunnelIcon } from '../icons';
import { CheckboxList } from '../CheckboxList';
import { useClickOutside } from '../../hooks/useClickOutside';
import { NumericFilter } from '../Filters/NumericFilter';
import { CategoricalFilter } from '../Filters/CategoricalFilter';
import { ColumnTypeBadge } from '../ColumnTypeBadge';

interface Props {
  headers: string[];
  rows: CellValue[][];
  totalRows: number;
  columns: ColumnMeta[];
  rawColumnStatsMap: Record<string, NumericStats | CategoricalStats>;
  filterMap: Record<string, ColumnFilter>;
  onFilterChange: (colName: string, filter: ColumnFilter | null) => void;
  onToggleType: (colName: string) => void;
  onClearAllFilters: () => void;
}

type SortDir = 'asc' | 'desc' | null;

const PAGE_SIZE = 500;

function isNumericStats(s: NumericStats | CategoricalStats): s is NumericStats {
  return 'mean' in s;
}

function isFilterActive(filter: ColumnFilter | undefined): boolean {
  if (!filter) return false;
  if (filter.type === 'numeric') return filter.min !== null || filter.max !== null || filter.exact !== null;
  return filter.selected !== null;
}

function filterSummary(filter: ColumnFilter): string {
  if (filter.type === 'numeric') {
    if (filter.exact !== null) return `= ${filter.exact}`;
    const parts: string[] = [];
    if (filter.min !== null) parts.push(`≥ ${filter.min}`);
    if (filter.max !== null) parts.push(`≤ ${filter.max}`);
    return parts.join(', ');
  }
  if (filter.selected === null || filter.selected.size === 0) return filter.selected === null ? 'All' : '(none)';
  const vals = Array.from(filter.selected);
  if (vals.length <= 2) return vals.join(', ');
  return `${vals.slice(0, 2).join(', ')} +${vals.length - 2}`;
}

interface FilterPopoverProps {
  colName: string;
  column: ColumnMeta;
  stats: NumericStats | CategoricalStats;
  filter: ColumnFilter | undefined;
  onFilterChange: (f: ColumnFilter | null) => void;
  onToggleType: () => void;
  anchorRect: DOMRect;
  onClose: () => void;
}

function FilterPopover({ colName, column, stats, filter, onFilterChange, onToggleType, anchorRect, onClose }: FilterPopoverProps) {
  const ref = useClickOutside<HTMLDivElement>(onClose);

  const defaultNumericFilter: NumericFilterType = { type: 'numeric', min: null, max: null, exact: null };
  const defaultCategoricalFilter: CategoricalFilterType = { type: 'categorical', selected: null };

  const active = isFilterActive(filter);

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 4,
        left: Math.min(anchorRect.left, window.innerWidth - 272),
        zIndex: 200,
        width: 264,
      }}
      className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-gray-700 truncate">{colName}</span>
          <ColumnTypeBadge type={column.type} variant="short" onClick={onToggleType} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {active && (
            <button
              type="button"
              onClick={() => onFilterChange(null)}
              className="text-xs text-red-500 hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer ml-1">
            <XIcon size={13} />
          </button>
        </div>
      </div>
      {column.type === 'numeric' && isNumericStats(stats) ? (
        <NumericFilter
          colName={colName}
          stats={stats}
          filter={filter as NumericFilterType ?? defaultNumericFilter}
          onChange={onFilterChange}
        />
      ) : (
        <CategoricalFilter
          stats={stats as CategoricalStats}
          filter={filter as CategoricalFilterType ?? defaultCategoricalFilter}
          onChange={onFilterChange}
        />
      )}
    </div>,
    document.body,
  );
}

export function DataTable({ headers, rows, totalRows, columns, rawColumnStatsMap, filterMap, onFilterChange, onToggleType, onClearAllFilters }: Props) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(headers));
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState<{ col: string; rect: DOMRect } | null>(null);

  const pickerRef = useClickOutside<HTMLDivElement>(() => setColPickerOpen(false));
  const filterPickerRef = useClickOutside<HTMLDivElement>(() => setFilterPickerOpen(false));
  const filterPickerBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [expanded]);

  const visibleHeaders = useMemo(
    () => headers.filter((h) => visibleCols.has(h)),
    [headers, visibleCols],
  );

  const visibleIndices = useMemo(
    () => headers.map((h, i) => ({ h, i })).filter(({ h }) => visibleCols.has(h)).map(({ i }) => i),
    [headers, visibleCols],
  );

  const sortedRows = useMemo(() => {
    const slice = rows.slice(0, PAGE_SIZE);
    if (sortCol === null || sortDir === null) return slice;
    return [...slice].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      const an = Number(av), bn = Number(bv);
      const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir]);

  const handleSort = useCallback((colIdx: number) => {
    setSortCol((prev) => {
      if (prev === colIdx) {
        setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
        return colIdx;
      }
      setSortDir('asc');
      return colIdx;
    });
  }, []);

  const downloadCsv = useCallback(() => {
    const lines: string[] = [visibleHeaders.map((h) => `"${h}"`).join(',')];
    for (const row of rows) {
      lines.push(visibleIndices.map((i) => `"${String(row[i] ?? '')}"`).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'filtered_data.csv';
    link.click();
  }, [rows, visibleHeaders, visibleIndices]);

  const toggleCol = (name: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleFilterBtn = (e: React.MouseEvent<HTMLButtonElement>, colName: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setFilterAnchor((prev) => prev?.col === colName ? null : { col: colName, rect });
  };

  if (headers.length === 0) return null;

  const filteredFilterList = filterSearch
    ? headers.filter((h) => h.toLowerCase().includes(filterSearch.toLowerCase()))
    : headers;

  const activeFilterCount = Object.values(filterMap).filter(isFilterActive).length;
  const activeFilterEntries = Object.entries(filterMap).filter(([, f]) => isFilterActive(f));

  const renderContent = (isModal: boolean) => (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm text-gray-600">
          Showing {Math.min(rows.length, PAGE_SIZE).toLocaleString()} of {rows.length.toLocaleString()} rows
          {rows.length !== totalRows && <span className="text-blue-600"> (filtered from {totalRows.toLocaleString()})</span>}
          {activeFilterCount > 0 && (
            <>
              <span className="ml-2 text-orange-500">{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
              <button
                type="button"
                onClick={onClearAllFilters}
                className="ml-2 text-xs text-red-500 hover:underline cursor-pointer"
              >
                Reset all
              </button>
            </>
          )}
        </span>
        <div className="flex items-center gap-2">
          {/* Filter picker */}
          <div className="relative" ref={filterPickerRef}>
            <button
              ref={filterPickerBtnRef}
              type="button"
              onClick={() => setFilterPickerOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-lg bg-white hover:bg-gray-50 cursor-pointer ${activeFilterCount > 0 ? 'border-orange-300 text-orange-600' : ''}`}
            >
              <FunnelIcon size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="text-xs bg-orange-100 text-orange-600 rounded-full px-1.5 py-0.5 leading-none">{activeFilterCount}</span>
              )}
            </button>
            {filterPickerOpen && (
              <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2">
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Search columns..."
                    autoFocus
                    className="w-full border rounded px-2 py-1 text-xs pr-6"
                  />
                  {filterSearch && (
                    <button onClick={() => setFilterSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
                      <XIcon size={12} />
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {filteredFilterList.map((h) => {
                    const hasFilter = isFilterActive(filterMap[h]);
                    const col = columns.find((c) => c.name === h);
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          setFilterPickerOpen(false);
                          const rect = filterPickerBtnRef.current?.getBoundingClientRect();
                          if (rect) setFilterAnchor({ col: h, rect });
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-50 cursor-pointer ${hasFilter ? 'bg-orange-50' : ''}`}
                      >
                        <FunnelIcon size={11} className={hasFilter ? 'fill-orange-400 stroke-orange-500' : 'text-gray-300'} />
                        <span className="flex-1 text-xs truncate">{h}</span>
                        {col && <ColumnTypeBadge type={col.type} variant="short" />}
                        {hasFilter && <span className="text-xs text-orange-500 shrink-0 max-w-20 truncate">{filterSummary(filterMap[h])}</span>}
                      </button>
                    );
                  })}
                  {filteredFilterList.length === 0 && (
                    <div className="text-xs text-gray-400 px-1 py-1">No matches</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Column picker */}
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setColPickerOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
            >
              <ColumnsIcon size={14} />Columns
            </button>
            {colPickerOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2">
                <CheckboxList
                  items={headers.map((h) => ({ key: h }))}
                  isChecked={(k) => visibleCols.has(k)}
                  onToggle={toggleCol}
                  onAll={(visibleKeys) => setVisibleCols((prev) => new Set([...prev, ...visibleKeys]))}
                  onNone={(visibleKeys) => setVisibleCols((prev) => { const next = new Set(prev); visibleKeys.forEach((k) => next.delete(k)); return next; })}
                  activeCount={visibleCols.size}
                  totalCount={headers.length}
                  countLabel="visible"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={downloadCsv}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
          >
            <DownloadIcon size={14} />Download CSV
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={isModal ? 'Close fullscreen' : 'Expand fullscreen'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
          >
            {isModal ? <XIcon size={14} /> : <ExpandIcon size={14} />}
            {isModal ? 'Close' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilterEntries.map(([colName, filter]) => (
            <span
              key={colName}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs bg-orange-50 border border-orange-200 text-orange-700"
            >
              <span className="font-medium truncate max-w-32">{colName}</span>
              <span className="text-orange-400">:</span>
              <span className="truncate max-w-28">{filterSummary(filter)}</span>
              <button
                type="button"
                onClick={() => onFilterChange(colName, null)}
                className="ml-0.5 text-orange-400 hover:text-orange-600 cursor-pointer shrink-0"
              >
                <XIcon size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-auto rounded-lg border border-gray-200 bg-white"
        style={{ maxHeight: isModal ? 'calc(100vh - 10rem)' : '400px' }}
      >
        <table className="text-sm w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              {visibleHeaders.map((h) => {
                const idx = headers.indexOf(h);
                const isActive = sortCol === idx;
                const col = columns.find((c) => c.name === h);
                const rawStats = rawColumnStatsMap[h];
                const hasFilter = isFilterActive(filterMap[h]);

                return (
                  <th
                    key={h}
                    className={`px-2 py-2 text-left font-medium text-gray-700 border-b border-gray-200 whitespace-nowrap select-none ${hasFilter ? 'bg-orange-50' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort(idx)}
                        className="flex items-center gap-1 flex-1 min-w-0 hover:text-blue-600 cursor-pointer text-left"
                      >
                        <span className="truncate">{h}</span>
                        {isActive && sortDir === 'asc' && <ChevronUpIcon size={12} />}
                        {isActive && sortDir === 'desc' && <ChevronDownIcon size={12} />}
                      </button>
                      {col && rawStats && (
                        <button
                          type="button"
                          onClick={(e) => handleFilterBtn(e, h)}
                          className={`p-0.5 rounded cursor-pointer shrink-0 ${hasFilter ? 'text-orange-500' : 'text-gray-300 hover:text-gray-500'}`}
                          title="Filter this column"
                        >
                          <FunnelIcon size={12} className={hasFilter ? 'fill-orange-400 stroke-orange-500' : ''} />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {visibleIndices.map((ci) => (
                  <td key={ci} className="px-3 py-1.5 text-gray-800 border-b border-gray-100 whitespace-nowrap max-w-xs truncate">
                    {row[ci] !== null ? String(row[ci]) : <span className="text-gray-300 italic">null</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const openFilter = filterAnchor
    ? { col: filterAnchor.col, column: columns.find((c) => c.name === filterAnchor.col), stats: rawColumnStatsMap[filterAnchor.col] }
    : null;

  return (
    <>
      {renderContent(false)}
      {openFilter?.column && openFilter.stats && (
        <FilterPopover
          colName={openFilter.col}
          column={openFilter.column}
          stats={openFilter.stats}
          filter={filterMap[openFilter.col]}
          onFilterChange={(f) => onFilterChange(openFilter.col, f)}
          onToggleType={() => onToggleType(openFilter.col)}
          anchorRect={filterAnchor!.rect}
          onClose={() => setFilterAnchor(null)}
        />
      )}
      {expanded && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
          <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200 shrink-0">
            <span className="font-semibold text-gray-800">Data Table — Fullscreen</span>
          </div>
          <div className="flex-1 overflow-hidden bg-gray-50 p-4">
            {renderContent(true)}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
