import type { NumericStats } from '../../utils/histogramBinner';
import { fmtNum } from '../../utils/dataUtils';

interface Props {
  stats: NumericStats;
}

export function BoxPlotChart({ stats }: Props) {
  const { min, max, q1, q3, median, mean } = stats;
  if (min === max) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Constant value: {fmtNum(min)}</div>;
  }

  const W = 320;
  const H = 120;
  const PAD = 40;
  const plotW = W - PAD * 2;

  const toX = (v: number) => PAD + ((v - min) / (max - min)) * plotW;
  const midY = H / 2;
  const boxH = 40;
  const whiskerH = 12;

  const q1x = toX(q1);
  const q3x = toX(q3);
  const medX = toX(median);
  const meanX = toX(mean);
  const minX = toX(min);
  const maxX = toX(max);

  // Two-row staggered labels to avoid overlap
  // Row A (closer to box): min, median, max  — rowYA
  // Row B (further below): Q1, Q3            — rowYB
  const boxBottom = midY + boxH / 2;
  const rowYA = boxBottom + 14;
  const rowYB = boxBottom + 26;
  const totalH = H + 40;

  const labels = [
    { x: minX,  label: fmtNum(min, 2),            rowY: rowYA },
    { x: q1x,   label: `Q1 ${fmtNum(q1, 2)}`,     rowY: rowYB },
    { x: medX,  label: `Med ${fmtNum(median, 2)}`, rowY: rowYA },
    { x: q3x,   label: `Q3 ${fmtNum(q3, 2)}`,     rowY: rowYB },
    { x: maxX,  label: fmtNum(max, 2),             rowY: rowYA },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} width="100%" height={totalH} className="overflow-visible">
      {/* Whiskers */}
      <line x1={minX} y1={midY} x2={q1x} y2={midY} stroke="#6b7280" strokeWidth={1.5} />
      <line x1={q3x} y1={midY} x2={maxX} y2={midY} stroke="#6b7280" strokeWidth={1.5} />
      {/* Whisker caps */}
      <line x1={minX} y1={midY - whiskerH / 2} x2={minX} y2={midY + whiskerH / 2} stroke="#6b7280" strokeWidth={1.5} />
      <line x1={maxX} y1={midY - whiskerH / 2} x2={maxX} y2={midY + whiskerH / 2} stroke="#6b7280" strokeWidth={1.5} />
      {/* IQR box */}
      <rect
        x={q1x}
        y={midY - boxH / 2}
        width={q3x - q1x}
        height={boxH}
        fill="#bfdbfe"
        stroke="#3b82f6"
        strokeWidth={1.5}
      />
      {/* Median line */}
      <line x1={medX} y1={midY - boxH / 2} x2={medX} y2={midY + boxH / 2} stroke="#1d4ed8" strokeWidth={2} />
      {/* Mean dot */}
      <circle cx={meanX} cy={midY} r={4} fill="#ef4444" />

      {/* Staggered labels */}
      {labels.map(({ x, label, rowY }) => (
        <g key={label}>
          <line x1={x} y1={boxBottom + 2} x2={x} y2={rowY - 10} stroke="#d1d5db" strokeWidth={1} />
          <text x={x} y={rowY} textAnchor="middle" fontSize={11} fill="#6b7280">{label}</text>
        </g>
      ))}

      {/* Mean legend */}
      <circle cx={PAD} cy={totalH - 6} r={3} fill="#ef4444" />
      <text x={PAD + 6} y={totalH - 2} fontSize={11} fill="#6b7280">Mean</text>
    </svg>
  );
}
