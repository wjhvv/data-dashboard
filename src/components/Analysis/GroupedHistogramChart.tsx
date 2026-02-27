import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { CellValue } from '../../utils/dataUtils';
import { splitByGroup, computeGroupedHistogramData, GROUP_COLORS } from '../../utils/groupUtils';

interface Props {
  rows: CellValue[][];
  colIdx: number;
  groupColIdx: number;
  binCount?: number;
  groupColName?: string;
}

export function GroupedHistogramChart({ rows, colIdx, groupColIdx, binCount = 20, groupColName }: Props) {
  const { data, groups } = useMemo(() => {
    const grouped = splitByGroup(rows, groupColIdx);
    return {
      groups: Object.keys(grouped),
      data: computeGroupedHistogramData(grouped, colIdx, binCount),
    };
  }, [rows, colIdx, groupColIdx, binCount]);

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-gray-400 text-xs">No numeric data</div>;
  }

  return (
    <div>
      {/* Legend above chart — avoids overlap with rotated x-axis labels */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 px-1 pb-1 border-b border-gray-100">
        {groupColName && (
          <span className="text-xs text-gray-400 mr-1 self-center">by {groupColName}:</span>
        )}
        {groups.map((g, i) => (
          <span key={g} className="flex items-center gap-1.5 text-xs text-gray-700">
            <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length], borderRadius: '50%', flexShrink: 0 }} />
            <span className="truncate" style={{ maxWidth: 120 }}>{g}</span>
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" tickMargin={6}
            interval={Math.max(0, Math.ceil(data.length / 8) - 1)} />
          <YAxis tick={{ fontSize: 10 }} width={36} />
          <Tooltip />
          {groups.map((g, i) => (
            <Bar key={g} dataKey={g} fill={GROUP_COLORS[i % GROUP_COLORS.length]} opacity={0.8} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
