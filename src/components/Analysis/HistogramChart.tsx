import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { BinEntry } from '../../utils/histogramBinner';

interface Props {
  bins: BinEntry[];
}

export function HistogramChart({ bins }: Props) {
  if (bins.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>;
  }
  // Show at most ~8 labels to avoid overlap; interval=n means show every (n+1)-th tick
  const tickInterval = Math.max(0, Math.ceil(bins.length / 8) - 1);
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={bins} margin={{ top: 4, right: 8, bottom: 80, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          tickMargin={6}
          interval={tickInterval}
        />
        <YAxis tick={{ fontSize: 12 }} width={36} />
        <Tooltip
          formatter={(v: number | undefined) => [v ?? 0, 'Count']}
          labelFormatter={(label, payload) => {
            if (payload && payload[0]) {
              const d = payload[0].payload as BinEntry;
              return `${d.rangeMin.toFixed(2)} – ${d.rangeMax.toFixed(2)}`;
            }
            return label;
          }}
        />
        <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
