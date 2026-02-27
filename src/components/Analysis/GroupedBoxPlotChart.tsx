import { useMemo } from 'react';
import { computeNumericStats } from '../../utils/histogramBinner';
import type { CellValue } from '../../utils/dataUtils';
import { splitByGroup, GROUP_COLORS } from '../../utils/groupUtils';

interface Props {
  rows: CellValue[][];
  colIdx: number;
  groupColIdx: number;
  groupColName?: string;
}

export function GroupedBoxPlotChart({ rows, colIdx, groupColIdx, groupColName }: Props) {
  const groupStats = useMemo(() => {
    const grouped = splitByGroup(rows, groupColIdx);
    return Object.entries(grouped).map(([name, gRows], i) => ({
      name,
      color: GROUP_COLORS[i % GROUP_COLORS.length],
      stats: computeNumericStats(gRows.map((r) => r[colIdx])),
    }));
  }, [rows, colIdx, groupColIdx]);

  if (groupStats.length === 0) return null;

  const W = 480, padL = 40, padR = 12, padT = 12, innerH = 152;
  const maxNameLen = Math.max(...groupStats.map((g) => g.name.length));
  const needsRotation = groupStats.length > 4 || maxNameLen > 8;
  const padB = needsRotation ? 64 : 36;
  const H = padT + innerH + padB;
  const innerW = W - padL - padR;

  const globalMin = Math.min(...groupStats.map((g) => g.stats.min));
  const globalMax = Math.max(...groupStats.map((g) => g.stats.max));
  const range = globalMax - globalMin || 1;
  const toY = (v: number) => padT + innerH - ((v - globalMin) / range) * innerH;
  const colW = innerW / groupStats.length;
  const labelY = H - padB + (needsRotation ? 6 : 14);

  return (
    <div>
      {/* Color legend above chart */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 px-1 pb-1 border-b border-gray-100">
        {groupColName && (
          <span className="text-xs text-gray-400 mr-1 self-center">by {groupColName}:</span>
        )}
        {groupStats.map(({ name, color }) => (
          <span key={name} className="flex items-center gap-1.5 text-xs text-gray-700">
            <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: color, borderRadius: '50%', flexShrink: 0 }} />
            <span className="truncate" style={{ maxWidth: 110 }}>{name}</span>
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const val = globalMin + t * range;
          const y = toY(val);
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padL - 4} y={y} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#9ca3af">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}
        {groupStats.map(({ name, color, stats }, i) => {
          const cx = padL + (i + 0.5) * colW;
          const bw = Math.min(colW * 0.55, 44);
          const label = name.length > (needsRotation ? 12 : 8)
            ? name.slice(0, needsRotation ? 12 : 8) + '…'
            : name;
          return (
            <g key={name}>
              {/* Whiskers */}
              <line x1={cx} x2={cx} y1={toY(stats.min)} y2={toY(stats.max)} stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />
              <line x1={cx - bw / 3} x2={cx + bw / 3} y1={toY(stats.min)} y2={toY(stats.min)} stroke={color} strokeWidth={1.5} />
              <line x1={cx - bw / 3} x2={cx + bw / 3} y1={toY(stats.max)} y2={toY(stats.max)} stroke={color} strokeWidth={1.5} />
              {/* IQR box */}
              <rect x={cx - bw / 2} y={toY(stats.q3)} width={bw} height={Math.abs(toY(stats.q1) - toY(stats.q3))}
                fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} />
              {/* Median line */}
              <line x1={cx - bw / 2} x2={cx + bw / 2} y1={toY(stats.median)} y2={toY(stats.median)} stroke={color} strokeWidth={2.5} />
              {/* Mean dot */}
              <circle cx={cx} cy={toY(stats.mean)} r={3} fill={color} />
              {/* X-axis label — rotated when needed to avoid overlap */}
              {needsRotation ? (
                <text x={cx} y={labelY} textAnchor="end" fontSize={9} fill="#6b7280"
                  transform={`rotate(-40, ${cx}, ${labelY})`}>
                  {label}
                </text>
              ) : (
                <text x={cx} y={labelY} textAnchor="middle" fontSize={9} fill="#6b7280">
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
