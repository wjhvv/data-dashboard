import { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { CellValue } from '../../utils/dataUtils';
import type { ColumnMeta } from '../../hooks/useDataStore';
import { extractPairs, pearson } from '../../utils/correlationUtils';
import { splitByGroup, GROUP_COLORS } from '../../utils/groupUtils';

const MAX_POINTS = 3000;

interface Props {
  columns: ColumnMeta[];
  rows: CellValue[][];
  headers: string[];
  xCol: string;
  yCol: string;
  onXChange: (col: string) => void;
  onYChange: (col: string) => void;
  colorCol: string;
  onColorColChange: (col: string) => void;
  /** DOM id for the downloadable chart div (default: 'scatter-plot-chart') */
  chartId?: string;
}

function sample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  return arr.filter((_, i) => i % step === 0);
}

export function ScatterPlot({
  columns, rows, headers,
  xCol, yCol, onXChange, onYChange,
  colorCol, onColorColChange,
  chartId = 'scatter-plot-chart',
}: Props) {
  const numericCols = columns.filter((c) => c.type === 'numeric');
  const categoricalCols = columns.filter((c) => c.type === 'categorical');

  const xIdx = headers.indexOf(xCol);
  const yIdx = headers.indexOf(yCol);
  const colorIdx = colorCol ? headers.indexOf(colorCol) : -1;

  const { series, r } = useMemo(() => {
    if (xIdx < 0 || yIdx < 0 || xIdx === yIdx) return { series: [], r: NaN };

    if (colorIdx < 0) {
      const [xs, ys] = extractPairs(rows, xIdx, yIdx);
      return {
        series: [{ name: 'All', color: '#3b82f6', data: sample(xs.map((x, i) => ({ x, y: ys[i] })), MAX_POINTS) }],
        r: pearson(xs, ys),
      };
    }

    const grouped = splitByGroup(rows, colorIdx);
    const allXs: number[] = [], allYs: number[] = [];
    const perGroup = Math.floor(MAX_POINTS / Math.max(1, Object.keys(grouped).length));

    const seriesData = Object.entries(grouped).map(([g, gRows], i) => {
      const [xs, ys] = extractPairs(gRows, xIdx, yIdx);
      allXs.push(...xs); allYs.push(...ys);
      return { name: g, color: GROUP_COLORS[i % GROUP_COLORS.length], data: sample(xs.map((x, j) => ({ x, y: ys[j] })), perGroup) };
    });
    return { series: seriesData, r: pearson(allXs, allYs) };
  }, [rows, xIdx, yIdx, colorIdx]);

  const rAbs = Math.abs(r);
  const rColor = rAbs > 0.7 ? 'text-blue-600' : rAbs > 0.4 ? 'text-yellow-600' : 'text-gray-500';
  const isGrouped = series.length > 1;
  const hasChart = series.length > 0 && xIdx !== yIdx;

  return (
    <div className="space-y-3">
      {/* Axis + color selectors */}
      <div className="flex flex-wrap gap-3 items-center text-sm">
        <label className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs font-medium">X</span>
          <select value={xCol} onChange={(e) => onXChange(e.target.value)} className="border rounded px-2 py-1 text-xs bg-white cursor-pointer">
            {numericCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs font-medium">Y</span>
          <select value={yCol} onChange={(e) => onYChange(e.target.value)} className="border rounded px-2 py-1 text-xs bg-white cursor-pointer">
            {numericCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs font-medium">Color by</span>
          <select value={colorCol} onChange={(e) => onColorColChange(e.target.value)} className="border rounded px-2 py-1 text-xs bg-white cursor-pointer">
            <option value="">— none —</option>
            {categoricalCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        {!isNaN(r) && (
          <span className="text-xs text-gray-400 ml-auto">
            r = <strong className={rColor}>{r.toFixed(3)}</strong>
          </span>
        )}
      </div>

      {/* Downloadable chart area */}
      <div id={chartId} className="bg-white pt-2">
        {/* Group legend — above chart, inside downloadable area so it appears in PNG */}
        {isGrouped && hasChart && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 px-1 pb-1 border-b border-gray-100">
            <span className="text-xs text-gray-400 mr-1 self-center">by {colorCol}:</span>
            {series.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5 text-xs text-gray-700">
                <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: s.color, borderRadius: '50%', flexShrink: 0 }} />
                <span className="truncate" style={{ maxWidth: 130 }}>{s.name}</span>
              </span>
            ))}
          </div>
        )}

        {hasChart ? (
          <div className="flex items-stretch">
            {/* Y-axis label as HTML element — no SVG text overlap */}
            <div className="flex items-center justify-center" style={{ width: 18, flexShrink: 0 }}>
              <span
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 10, color: '#6b7280', maxHeight: 220 }}
                className="truncate select-none"
                title={yCol}
              >
                {yCol}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="x"
                    name={xCol}
                    type="number"
                    tick={{ fontSize: 10 }}
                    label={{ value: xCol, position: 'insideBottom', offset: -14, fontSize: 10 }}
                    height={42}
                  />
                  <YAxis
                    dataKey="y"
                    name={yCol}
                    type="number"
                    tick={{ fontSize: 10 }}
                    width={44}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const px = (payload.find((p) => p.name === 'x')?.value as number | undefined) ?? payload[0]?.value;
                      const py = (payload.find((p) => p.name === 'y')?.value as number | undefined) ?? payload[1]?.value;
                      return (
                        <div className="bg-white border border-gray-200 rounded shadow px-2 py-1.5 text-xs">
                          <div>{xCol}: {typeof px === 'number' ? px.toFixed(3) : px}</div>
                          <div>{yCol}: {typeof py === 'number' ? py.toFixed(3) : py}</div>
                        </div>
                      );
                    }}
                  />
                  {series.map((s) => (
                    <Scatter key={s.name} name={s.name} data={s.data} fill={s.color} fillOpacity={0.6} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
            Select two different numeric columns
          </div>
        )}
      </div>
    </div>
  );
}
