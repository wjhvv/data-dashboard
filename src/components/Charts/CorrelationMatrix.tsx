import { Fragment, useMemo } from 'react';
import type { CellValue } from '../../utils/dataUtils';
import type { ColumnMeta } from '../../hooks/useDataStore';
import { computeCorrelationMatrix } from '../../utils/correlationUtils';

interface Props {
  columns: ColumnMeta[];
  rows: CellValue[][];
  headers: string[];
  onSelectPair: (xCol: string, yCol: string) => void;
  selectedX?: string;
  selectedY?: string;
}

function corrColor(r: number): string {
  if (isNaN(r)) return '#f3f4f6';
  if (r < 0) {
    const t = Math.abs(r);
    return `rgb(${Math.round(255 + (59 - 255) * t)},${Math.round(255 + (130 - 255) * t)},${Math.round(255 + (246 - 255) * t)})`;
  }
  return `rgb(${Math.round(255 + (239 - 255) * r)},${Math.round(255 + (68 - 255) * r)},${Math.round(255 + (68 - 255) * r)})`;
}

export function CorrelationMatrix({ columns, rows, headers, onSelectPair, selectedX, selectedY }: Props) {
  const numericCols = columns.filter((c) => c.type === 'numeric');

  const { matrix, colNames } = useMemo(() => {
    const colNames = numericCols.map((c) => c.name);
    const colIndices = colNames.map((n) => headers.indexOf(n));
    return { matrix: computeCorrelationMatrix(rows, colIndices), colNames };
  }, [numericCols, rows, headers]);

  if (numericCols.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Need at least 2 numeric columns
      </div>
    );
  }

  const n = colNames.length;
  const cellSize = Math.max(20, Math.min(52, Math.floor(480 / n)));
  const labelH = Math.min(80, cellSize * 2);

  return (
    <div className="overflow-auto">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${cellSize * 2.5}px repeat(${n}, ${cellSize}px)`,
          gap: 1,
          minWidth: 'fit-content',
        }}
      >
        {/* Top-left corner */}
        <div style={{ height: labelH }} />
        {/* Column headers (rotated) */}
        {colNames.map((name, j) => (
          <div key={j} style={{ height: labelH, width: cellSize }} className="flex items-end justify-center pb-1 overflow-hidden">
            <span
              style={{
                fontSize: Math.max(8, Math.min(11, cellSize * 0.25)),
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                maxHeight: labelH - 4,
              }}
              className="text-gray-600 truncate"
            >
              {name}
            </span>
          </div>
        ))}
        {/* Rows */}
        {colNames.map((rowName, i) => (
          <Fragment key={i}>
            <div style={{ height: cellSize }} className="flex items-center justify-end pr-2 overflow-hidden">
              <span style={{ fontSize: Math.max(8, Math.min(11, cellSize * 0.25)) }} className="text-gray-600 truncate">
                {rowName}
              </span>
            </div>
            {colNames.map((colName, j) => {
              const r = matrix[i][j];
              const isDiag = i === j;
              const isSelected =
                (rowName === selectedX && colName === selectedY) ||
                (rowName === selectedY && colName === selectedX);
              return (
                <div
                  key={j}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: isDiag ? '#1e40af' : corrColor(r),
                    cursor: !isDiag ? 'pointer' : 'default',
                    outline: isSelected ? '2px solid #f59e0b' : 'none',
                    outlineOffset: -2,
                  }}
                  title={isDiag ? rowName : `${rowName} × ${colName}: ${isNaN(r) ? 'N/A' : r.toFixed(3)}`}
                  onClick={() => !isDiag && onSelectPair(rowName, colName)}
                  className="flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  {!isDiag && cellSize >= 28 && (
                    <span
                      style={{ fontSize: Math.max(7, cellSize * 0.22) }}
                      className={Math.abs(r) > 0.5 ? 'text-white font-medium' : 'text-gray-700'}
                    >
                      {isNaN(r) ? '' : r.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
        <span>-1</span>
        <div style={{ height: 8, width: 120, background: 'linear-gradient(to right, #3b82f6, #ffffff, #ef4444)', borderRadius: 2 }} />
        <span>+1</span>
        <span className="ml-2 text-gray-400">Click a cell to view scatter plot</span>
      </div>
    </div>
  );
}
