import { useState } from 'react';
import type { CellValue } from '../../utils/dataUtils';
import type { ColumnMeta } from '../../hooks/useDataStore';
import { CorrelationMatrix } from './CorrelationMatrix';
import { ScatterPlot } from './ScatterPlot';
import { computeCorrelationMatrix } from '../../utils/correlationUtils';
import { useClickOutside } from '../../hooks/useClickOutside';
import { ColumnsIcon, DownloadIcon, SearchIcon } from '../icons';
import { downloadAsPng } from '../../utils/downloadAsPng';

interface Props {
  columns: ColumnMeta[];
  rows: CellValue[][];
  headers: string[];
}

export function RelationshipsPanel({ columns, rows, headers }: Props) {
  const numericCols = columns.filter((c) => c.type === 'numeric');

  // Scatter state
  const [scatterX, setScatterX] = useState(numericCols[0]?.name ?? '');
  const [scatterY, setScatterY] = useState(numericCols[1]?.name ?? numericCols[0]?.name ?? '');
  const [colorCol, setColorCol] = useState('');

  // Correlation column filter: null = all shown, Set = only those in set shown
  const [corrColFilter, setCorrColFilter] = useState<Set<string> | null>(null);
  const [corrPickerOpen, setCorrPickerOpen] = useState(false);
  const [corrPickerSearch, setCorrPickerSearch] = useState('');
  const corrPickerRef = useClickOutside<HTMLDivElement>(() => setCorrPickerOpen(false));

  const filteredCorrCols = corrColFilter === null
    ? numericCols
    : numericCols.filter((c) => corrColFilter.has(c.name));

  const filteredPickerCols = corrPickerSearch
    ? numericCols.filter((c) => c.name.toLowerCase().includes(corrPickerSearch.toLowerCase()))
    : numericCols;

  const hasCustomCorrFilter = corrColFilter !== null;

  const toggleCorrCol = (name: string) => {
    setCorrColFilter((prev) => {
      if (prev === null) {
        const next = new Set(numericCols.map((c) => c.name));
        next.delete(name);
        return next;
      }
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const downloadCorrCsv = () => {
    const colNames = filteredCorrCols.map((c) => c.name);
    const colIndices = colNames.map((n) => headers.indexOf(n));
    const matrix = computeCorrelationMatrix(rows, colIndices);
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csvRows = [',' + colNames.map(q).join(',')];
    for (let i = 0; i < colNames.length; i++) {
      const cells = [q(colNames[i]), ...matrix[i].map((v) => (isNaN(v) ? '' : v.toFixed(4)))];
      csvRows.push(cells.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'correlation.csv';
    link.click();
  };

  const downloadCorrPng = () => downloadAsPng('correlation-matrix-chart', 'Correlation Matrix');
  const downloadScatterPng = () => downloadAsPng('scatter-plot-chart', `${scatterX} vs ${scatterY}`);

  if (numericCols.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
        Need at least 2 numeric columns for relationship analysis
      </div>
    );
  }

  const corrMatrixProps = {
    columns: filteredCorrCols,
    rows,
    headers,
    onSelectPair: (x: string, y: string) => { setScatterX(x); setScatterY(y); },
    selectedX: scatterX,
    selectedY: scatterY,
  };

  const scatterProps = {
    columns,
    rows,
    headers,
    xCol: scatterX,
    yCol: scatterY,
    onXChange: setScatterX,
    onYChange: setScatterY,
    colorCol,
    onColorColChange: setColorCol,
  };

  /* Shared action button style */
  const btnCls = 'flex items-center gap-1 px-2 py-1 text-xs border rounded-lg bg-white hover:bg-gray-50 cursor-pointer';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* ── Correlation Matrix ── */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Correlation Matrix
          <span className="ml-1.5 text-xs text-gray-400 font-normal">
            ({filteredCorrCols.length} / {numericCols.length} cols)
          </span>
        </h3>

        {/* Action buttons row — right-aligned */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap justify-end">
          {/* Column picker */}
          <div className="relative" ref={corrPickerRef}>
            <button
              type="button"
              onClick={() => setCorrPickerOpen(!corrPickerOpen)}
              className={`${btnCls} ${hasCustomCorrFilter ? '!bg-blue-600 !text-white !border-blue-600' : ''}`}
              title="Select columns"
            >
              <ColumnsIcon size={12} />
              Columns
              {hasCustomCorrFilter && (
                <span className="bg-white/30 rounded px-1">{filteredCorrCols.length}</span>
              )}
            </button>

            {corrPickerOpen && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2">
                <div className="relative mb-2">
                  <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={11} />
                  <input
                    type="text"
                    value={corrPickerSearch}
                    onChange={(e) => setCorrPickerSearch(e.target.value)}
                    placeholder="Search columns…"
                    className="w-full border rounded pl-6 pr-2 py-1 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 mb-2 text-xs border-b border-gray-100 pb-1.5">
                  <button
                    onClick={() => setCorrColFilter(null)}
                    className="text-blue-600 hover:underline cursor-pointer font-medium"
                  >
                    Select all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setCorrColFilter(new Set())}
                    className="text-gray-500 hover:underline cursor-pointer"
                  >
                    None
                  </button>
                  <span className="text-gray-400 ml-auto">
                    {filteredCorrCols.length} / {numericCols.length}
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-0.5">
                  {filteredPickerCols.map((c) => (
                    <label key={c.name} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={corrColFilter === null || corrColFilter.has(c.name)}
                        onChange={() => toggleCorrCol(c.name)}
                      />
                      <span className="text-xs truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="button" onClick={downloadCorrPng} className={btnCls} title="Download as PNG">
            <DownloadIcon size={12} /> PNG
          </button>
          <button type="button" onClick={downloadCorrCsv} className={btnCls} title="Download as CSV">
            <DownloadIcon size={12} /> CSV
          </button>
        </div>

        <div id="correlation-matrix-chart" className="bg-white">
          {filteredCorrCols.length >= 2 ? (
            <CorrelationMatrix {...corrMatrixProps} />
          ) : (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              {filteredCorrCols.length === 0 ? 'No columns selected — use Select all to reset' : 'Select at least 2 columns'}
            </div>
          )}
        </div>
      </div>

      {/* ── Scatter Plot ── */}
      <div className="mt-2 xl:mt-0">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Scatter Plot</h3>

        {/* Action buttons row — right-aligned */}
        <div className="flex items-center gap-1.5 mb-3 justify-end">
          <button type="button" onClick={downloadScatterPng} className={btnCls} title="Download as PNG">
            <DownloadIcon size={12} /> PNG
          </button>
        </div>

        <ScatterPlot {...scatterProps} />
      </div>
    </div>
  );
}
