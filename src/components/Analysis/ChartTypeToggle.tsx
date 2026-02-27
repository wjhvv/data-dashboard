export type ChartType = 'histogram' | 'boxplot';

interface Props {
  value: ChartType;
  onChange: (v: ChartType) => void;
}

export function ChartTypeToggle({ value, onChange }: Props) {
  return (
    <div className="flex rounded overflow-hidden border border-gray-200 text-xs">
      {(['histogram', 'boxplot'] as ChartType[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`px-2 py-0.5 capitalize cursor-pointer ${value === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          {t === 'histogram' ? 'Histogram' : 'Box Plot'}
        </button>
      ))}
    </div>
  );
}
