import { useState, useId, useEffect } from "react";
import type { ColumnMeta } from "../../hooks/useDataStore";
import { computeNumericBinsCustom } from "../../utils/histogramBinner";
import type {
  NumericStats,
  CategoricalStats,
  BinEntry,
} from "../../utils/histogramBinner";
import type { StatItem } from "../../utils/statsFormatters";
import {
  getNumericStatItems,
  getCategoricalStatItems,
} from "../../utils/statsFormatters";
import { HistogramChart } from "./HistogramChart";
import { BoxPlotChart } from "./BoxPlotChart";
import { CategoricalChart } from "./CategoricalChart";
import { GroupedHistogramChart } from "./GroupedHistogramChart";
import { GroupedBoxPlotChart } from "./GroupedBoxPlotChart";
import { GroupedCategoricalChart } from "./GroupedCategoricalChart";
import { ChartTypeToggle } from "./ChartTypeToggle";
import type { ChartType } from "./ChartTypeToggle";
import { BinCountSlider } from "./BinCountSlider";
import { ExpandedChartModal } from "./ExpandedChartModal";
import { ColumnTypeBadge } from "../ColumnTypeBadge";
import { DownloadIcon, ExpandIcon, SettingsIcon } from "../icons";
import { downloadAsPng } from "../../utils/downloadAsPng";
import { CategoricalStatsTable } from "./CategoricalStatsTable";
import type { CellValue } from "../../utils/dataUtils";

interface Props {
  column: ColumnMeta;
  stats: NumericStats | CategoricalStats;
  defaultBins: BinEntry[];
  rows: CellValue[][];
  headers: string[];
  onToggleType: () => void;
  groupBy: string | null;
  chartDomId?: string;
}

function isNumericStats(s: NumericStats | CategoricalStats): s is NumericStats {
  return "mean" in s;
}

/** Compact stats table rendered inside the downloadable area */
function StatsTable({ items }: { items: StatItem[] }) {
  // Group into rows of 3 columns
  const rows: StatItem[][] = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));
  return (
    <table className="w-full text-xs border-collapse mt-1">
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className={ri % 2 === 0 ? "bg-gray-50" : "bg-white"}>
            {row.map(({ label, value }) => (
              <td key={label} className="border border-gray-200 px-2 py-1 w-1/3">
                <span className="text-gray-400">{label}</span>
                <span className="ml-1.5 font-medium text-gray-700 tabular-nums">{value}</span>
              </td>
            ))}
            {/* Pad row if fewer than 3 items */}
            {Array.from({ length: 3 - row.length }).map((_, i) => (
              <td key={i} className="border border-gray-200 w-1/3" />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ColumnAnalysis({
  column,
  stats,
  defaultBins,
  rows,
  headers,
  onToggleType,
  groupBy,
  chartDomId,
}: Props) {
  const generatedId = useId().replace(/:/g, "_");
  const chartId = chartDomId ?? generatedId;
  const [chartType, setChartType] = useState<ChartType>("histogram");
  const [binCount, setBinCount] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setChartType("histogram");
    setBinCount(null);
    setShowAdvanced(false);
  }, [column.type]);

  const isNumeric = column.type === "numeric";

  const colIdx = headers.indexOf(column.name);
  const groupColIdx = groupBy ? headers.indexOf(groupBy) : -1;
  const isGrouped = groupBy !== null && groupColIdx >= 0 && groupBy !== column.name;

  const bins = isNumeric
    ? binCount !== null
      ? computeNumericBinsCustom(
          rows.map((r) => r[headers.indexOf(column.name)]),
          binCount,
        )
      : defaultBins
    : [];

  const statItems = isNumericStats(stats)
    ? getNumericStatItems(stats)
    : getCategoricalStatItems(stats);

  const downloadTitle = groupBy ? `${column.name} (by ${groupBy})` : column.name;
  const handleDownload = () => downloadAsPng(`chart-${chartId}`, downloadTitle);

  /** Downloadable area: chart + stats table */
  const downloadableContent = (
    <div id={`chart-${chartId}`} className="bg-white px-2 pt-1 pb-2">
      {isGrouped ? (
        isNumeric ? (
          chartType === "histogram" ? (
            <GroupedHistogramChart rows={rows} colIdx={colIdx} groupColIdx={groupColIdx} binCount={binCount ?? undefined} groupColName={groupBy ?? undefined} />
          ) : (
            <GroupedBoxPlotChart rows={rows} colIdx={colIdx} groupColIdx={groupColIdx} groupColName={groupBy ?? undefined} />
          )
        ) : (
          <GroupedCategoricalChart rows={rows} colIdx={colIdx} groupColIdx={groupColIdx} groupColName={groupBy ?? undefined} />
        )
      ) : (
        isNumeric ? (
          chartType === "histogram" ? (
            <HistogramChart bins={bins} />
          ) : (
            isNumericStats(stats) && <BoxPlotChart stats={stats} />
          )
        ) : (
          <CategoricalChart stats={stats as CategoricalStats} />
        )
      )}
      <StatsTable items={statItems} />
    </div>
  );

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <span className="font-medium text-sm truncate flex-1">{column.name}</span>
        <ColumnTypeBadge type={column.type} variant="short" onClick={onToggleType} />
        {isNumeric && (
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            title="Advanced options"
            className={`p-1 rounded hover:bg-gray-100 cursor-pointer ${
              showAdvanced ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <SettingsIcon size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          title="Download chart"
          className="p-1 rounded hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600"
        >
          <DownloadIcon size={14} />
        </button>
      </div>

      {/* Advanced panel */}
      {isNumeric && showAdvanced && (
        <div className="px-3 pb-2 space-y-1.5 border-b border-gray-100">
          <ChartTypeToggle value={chartType} onChange={setChartType} />
          {chartType === "histogram" && (
            <BinCountSlider value={binCount} onChange={setBinCount} />
          )}
        </div>
      )}

      {/* Downloadable: chart + stats table */}
      {downloadableContent}

      {/* Categorical value breakdown (not in download) */}
      {!isNumeric && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2">
          <CategoricalStatsTable stats={stats as CategoricalStats} />
        </div>
      )}

      {/* Expanded modal */}
      {expanded && (
        <ExpandedChartModal title={column.name} onClose={() => setExpanded(false)}>
          <div className="space-y-3">
            {isNumeric && (
              <div className="flex flex-wrap gap-3 items-center">
                <ChartTypeToggle value={chartType} onChange={setChartType} />
                {chartType === "histogram" && (
                  <BinCountSlider value={binCount} onChange={setBinCount} />
                )}
              </div>
            )}
            <div className="min-h-64">
              {isGrouped ? (
                isNumeric ? (
                  chartType === "histogram" ? (
                    <GroupedHistogramChart rows={rows} colIdx={colIdx} groupColIdx={groupColIdx} binCount={binCount ?? undefined} groupColName={groupBy ?? undefined} />
                  ) : (
                    <GroupedBoxPlotChart rows={rows} colIdx={colIdx} groupColIdx={groupColIdx} groupColName={groupBy ?? undefined} />
                  )
                ) : (
                  <GroupedCategoricalChart rows={rows} colIdx={colIdx} groupColIdx={groupColIdx} groupColName={groupBy ?? undefined} />
                )
              ) : (
                isNumeric ? (
                  chartType === "histogram" ? (
                    <HistogramChart bins={bins} />
                  ) : (
                    isNumericStats(stats) && <BoxPlotChart stats={stats} />
                  )
                ) : (
                  <CategoricalChart stats={stats as CategoricalStats} />
                )
              )}
            </div>
            <StatsTable items={statItems} />
            {!isNumeric && (
              <CategoricalStatsTable stats={stats as CategoricalStats} />
            )}
          </div>
        </ExpandedChartModal>
      )}
    </div>
  );
}
