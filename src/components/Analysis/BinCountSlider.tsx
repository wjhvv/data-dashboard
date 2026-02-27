interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
}

const DEFAULT_BIN_COUNT = 20;

export function BinCountSlider({ value, onChange, min = 5, max = 100 }: Props) {
  const current = value ?? DEFAULT_BIN_COUNT;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 shrink-0">Bins:</span>
      <input
        type="range"
        min={min}
        max={max}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-600"
      />
      <span className="w-6 text-right text-gray-700">{current}</span>
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-gray-400 hover:text-gray-600 cursor-pointer text-xs"
          title="Reset to auto"
        >
          Auto
        </button>
      )}
    </div>
  );
}
