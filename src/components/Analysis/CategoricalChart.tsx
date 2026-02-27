import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { CategoricalStats } from '../../utils/histogramBinner';

interface Props {
  stats: CategoricalStats;
}

function isAllNumeric(keys: string[]): boolean {
  const nonEmpty = keys.filter((k) => k !== '(empty)');
  return nonEmpty.length > 0 && nonEmpty.every((k) => isFinite(Number(k)));
}

export function CategoricalChart({ stats }: Props) {
  const entries = Array.from(stats.counts.entries());
  const numericValues = isAllNumeric(entries.map(([k]) => k));

  const data = entries
    .sort((a, b) =>
      numericValues ? Number(a[0]) - Number(b[0]) : b[1] - a[1]
    )
    .slice(0, 30)
    .map(([label, count]) => ({ label, count }));

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 80, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          tickMargin={6}
          interval={0}
        />
        <YAxis tick={{ fontSize: 12 }} width={36} />
        <Tooltip formatter={(v: number | undefined) => [v ?? 0, 'Count']} />
        <Bar dataKey="count" fill="#10b981" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
