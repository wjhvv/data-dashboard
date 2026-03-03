import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ColumnMeta } from '../../hooks/useDataStore';
import type { NumericStats, CategoricalStats, BinEntry } from '../../utils/histogramBinner';
import type { CellValue } from '../../utils/dataUtils';
import { ColumnAnalysis } from './ColumnAnalysis';
import { AllStatsTable } from './AllStatsTable';
import { ChartFilterIcon, SearchIcon, XIcon, SpinnerIcon, ExpandIcon, DownloadIcon } from '../icons';
import { CheckboxList } from '../CheckboxList';
import { useClickOutside } from '../../hooks/useClickOutside';
import { captureChartAsPng } from '../../utils/downloadAsPng';

type Tab = 'charts' | 'stats';

interface Props {
  columns: ColumnMeta[];
  columnStatsMap: Record<string, NumericStats | CategoricalStats>;
  histogramBinsMap: Record<string, BinEntry[]>;
  rows: CellValue[][];
  headers: string[];
  onToggleType: (colName: string) => void;
  isStale: boolean;
  onExpand?: () => void;
}

const PAGE_SIZE = 6;

function chartDomId(colName: string) {
  return `analysis_chart_${colName.replace(/\W/g, '_')}`;
}

export function AnalysisPanel({
  columns,
  columnStatsMap,
  histogramBinsMap,
  rows,
  headers,
  onToggleType,
  isStale,
  onExpand,
}: Props) {
  const [chartSearch, setChartSearch] = useState('');
  // null = show all; Set<string> = explicit list (empty Set = show none)
  const [visibleCharts, setVisibleCharts] = useState<Set<string> | null>(null);
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('charts');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [renderAllForZip, setRenderAllForZip] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);

  useEffect(() => {
    if (!statsExpanded) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setStatsExpanded(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [statsExpanded]);

  const pickerRef = useClickOutside<HTMLDivElement>(() => setChartPickerOpen(false));

  const hasCustomSelection = visibleCharts !== null;

  const displayColumns = columns.filter((c) => {
    const matchSearch = !chartSearch || c.name.toLowerCase().includes(chartSearch.toLowerCase());
    const matchPicker = visibleCharts === null || visibleCharts.has(c.name);
    return matchSearch && matchPicker;
  });

  const totalPages = Math.ceil(displayColumns.length / PAGE_SIZE);
  const pageColumns = displayColumns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Columns not on the current page — rendered off-screen during ZIP download
  const pageColNames = new Set(pageColumns.map((c) => c.name));
  const offScreenCols = renderAllForZip
    ? displayColumns.filter((c) => !pageColNames.has(c.name))
    : [];

  const handleChartSearch = (v: string) => {
    setChartSearch(v);
    setPage(0);
  };

  const toggleChart = (name: string) => {
    setVisibleCharts((prev) => {
      if (prev === null) {
        const next = new Set(columns.map((c) => c.name));
        next.delete(name);
        return next;
      }
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next.size >= columns.length ? null : next;
    });
    setPage(0);
  };


  const downloadAllZip = async () => {
    setDownloadingZip(true);
    setRenderAllForZip(true);
    // Wait for React to render off-screen charts + Recharts ResizeObserver to settle
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const col of displayColumns) {
        const title = groupBy ? `${col.name} (by ${groupBy})` : col.name;
        const dataUrl = await captureChartAsPng(`chart-${chartDomId(col.name)}`, title);
        if (dataUrl) {
          const base64 = dataUrl.split(',')[1];
          zip.file(`${col.name}.png`, base64, { base64: true });
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'charts.zip';
      link.click();
    } finally {
      setRenderAllForZip(false);
      setDownloadingZip(false);
    }
  };

  const downloadStatsCsv = () => {
    const header = ['Column', 'Type', 'Count', 'Nulls', 'Mean', 'StdDev', 'Min', 'Q1', 'Median', 'Q3', 'Max', 'Unique'];
    const csvRows = [header.join(',')];
    for (const col of displayColumns) {
      const s = columnStatsMap[col.name];
      if (!s) continue;
      const isNum = 'mean' in s;
      const ns = isNum ? (s as NumericStats) : null;
      const cs = !isNum ? (s as CategoricalStats) : null;
      const fmt = (v: number) => Number.isInteger(v) ? String(v) : v.toPrecision(6);
      const row = [
        `"${col.name.replace(/"/g, '""')}"`, col.type,
        isNum ? ns!.count : cs!.total, s.nullCount,
        isNum ? fmt(ns!.mean) : '', isNum ? fmt(ns!.stdDev) : '',
        isNum ? fmt(ns!.min) : '', isNum ? fmt(ns!.q1) : '',
        isNum ? fmt(ns!.median) : '', isNum ? fmt(ns!.q3) : '',
        isNum ? fmt(ns!.max) : '', isNum ? '' : cs!.uniqueCount,
      ];
      csvRows.push(row.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'stats.csv';
    link.click();
  };

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Upload a file to see charts
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Tab bar — tabs on left, action buttons on right */}
      <div className="flex items-center border-b border-gray-200">
        {(['charts', 'stats'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'charts' ? 'Charts' : 'Stats'}
          </button>
        ))}
        {isStale && <SpinnerIcon size={16} className="text-blue-500 ml-2" />}

        {/* Action buttons — always in the same spot */}
        <div className="ml-auto flex items-center gap-1.5 pb-1">
          {tab === 'charts' ? (
            <>
              <button
                type="button"
                onClick={downloadAllZip}
                disabled={downloadingZip}
                className="flex items-center gap-1 px-2.5 py-1 text-sm border rounded-lg bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-default"
                title="Download all charts as ZIP"
              >
                <DownloadIcon size={13} />
                {downloadingZip ? 'Zipping…' : 'ZIP'}
              </button>
              {onExpand && (
                <button
                  type="button"
                  onClick={onExpand}
                  className="flex items-center gap-1 px-2.5 py-1 text-sm border rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
                  title="Expand fullscreen"
                >
                  <ExpandIcon size={13} />
                  Expand
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={downloadStatsCsv}
                className="flex items-center gap-1 px-2.5 py-1 text-sm border rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
                title="Download stats as CSV"
              >
                <DownloadIcon size={13} />
                CSV
              </button>
              <button
                type="button"
                onClick={() => setStatsExpanded(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-sm border rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
                title="Expand fullscreen"
              >
                <ExpandIcon size={13} />
                Expand
              </button>
            </>
          )}
        </div>
      </div>

      {tab === 'charts' ? (
        <>
          {/* Charts toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={chartSearch}
                onChange={(e) => handleChartSearch(e.target.value)}
                placeholder="Search charts..."
                className="w-full pl-8 pr-8 py-1.5 border rounded-lg text-sm bg-white"
              />
              {chartSearch && (
                <button onClick={() => handleChartSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  <XIcon size={13} />
                </button>
              )}
            </div>

            {/* Chart column picker */}
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setChartPickerOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-lg cursor-pointer ${hasCustomSelection ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}
              >
                <ChartFilterIcon size={14} />
                Columns
                {visibleCharts !== null && <span className="bg-white/30 rounded text-xs px-1">{visibleCharts.size}</span>}
              </button>
              {chartPickerOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2">
                  <CheckboxList
                    items={columns.map((c) => ({ key: c.name }))}
                    isChecked={(k) => visibleCharts === null || visibleCharts.has(k)}
                    onToggle={toggleChart}
                    onAll={(visibleKeys) => {
                      setVisibleCharts((prev) => {
                        if (prev === null) return null;
                        const next = new Set([...prev, ...visibleKeys]);
                        return next.size >= columns.length ? null : next;
                      });
                      setPage(0);
                    }}
                    onNone={(visibleKeys) => {
                      setVisibleCharts((prev) => {
                        const current = prev === null ? new Set(columns.map((c) => c.name)) : new Set(prev);
                        const visSet = new Set(visibleKeys);
                        return new Set([...current].filter((k) => !visSet.has(k)));
                      });
                      setPage(0);
                    }}
                    activeCount={visibleCharts === null ? columns.length : visibleCharts.size}
                    totalCount={columns.length}
                    countLabel="visible"
                  />
                </div>
              )}
            </div>

            {/* Group By */}
            {columns.some((c) => c.type === 'categorical') && (
              <label className="flex items-center gap-1.5 text-sm">
                <span className="text-gray-500 whitespace-nowrap">Group by</span>
                <select
                  value={groupBy ?? ''}
                  onChange={(e) => setGroupBy(e.target.value || null)}
                  className="border rounded px-2 py-1 text-sm bg-white cursor-pointer"
                >
                  <option value="">— none —</option>
                  {columns.filter((c) => c.type === 'categorical').map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}

            <span className="text-sm text-gray-500 ml-auto">
              {displayColumns.length} / {columns.length} charts
            </span>
          </div>

          {/* Chart grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pageColumns.map((col) => {
              const stats = columnStatsMap[col.name];
              if (!stats) return null;
              return (
                <ColumnAnalysis
                  key={col.name}
                  column={col}
                  stats={stats}
                  defaultBins={histogramBinsMap[col.name] ?? []}
                  rows={rows}
                  headers={headers}
                  onToggleType={() => onToggleType(col.name)}
                  groupBy={groupBy}
                  chartDomId={chartDomId(col.name)}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm border rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">Page {page + 1} / {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm border rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <AllStatsTable columns={displayColumns} columnStatsMap={columnStatsMap} />
      )}

      {/* Stats fullscreen modal */}
      {statsExpanded && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
          <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-800">Column Stats — Fullscreen</span>
              <button
                type="button"
                onClick={downloadStatsCsv}
                className="flex items-center gap-1 px-2.5 py-1 text-sm border rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
              >
                <DownloadIcon size={13} />
                CSV
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStatsExpanded(false)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 cursor-pointer"
              title="Close (Esc)"
            >
              <XIcon size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <AllStatsTable columns={displayColumns} columnStatsMap={columnStatsMap} />
          </div>
        </div>,
        document.body
      )}

      {/* Off-screen render for ZIP: columns not on current page */}
      {renderAllForZip && createPortal(
        <div style={{ position: 'fixed', left: '-9999px', top: 0, width: 640, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {offScreenCols.map((col) => {
            const stats = columnStatsMap[col.name];
            if (!stats) return null;
            return (
              <ColumnAnalysis
                key={col.name}
                column={col}
                stats={stats}
                defaultBins={histogramBinsMap[col.name] ?? []}
                rows={rows}
                headers={headers}
                onToggleType={() => onToggleType(col.name)}
                groupBy={groupBy}
                chartDomId={chartDomId(col.name)}
              />
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
