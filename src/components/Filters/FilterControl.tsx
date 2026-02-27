import { useState } from 'react';
import type { ColumnMeta, ColumnFilter, NumericFilter as NumericFilterType, CategoricalFilter as CategoricalFilterType } from '../../hooks/useDataStore';
import type { NumericStats, CategoricalStats } from '../../utils/histogramBinner';
import { ColumnTypeBadge } from '../ColumnTypeBadge';
import { ChevronDownIcon, ChevronUpIcon } from '../icons';
import { NumericFilter } from './NumericFilter';
import { CategoricalFilter } from './CategoricalFilter';

interface Props {
  column: ColumnMeta;
  stats: NumericStats | CategoricalStats;
  filter: ColumnFilter | undefined;
  onFilterChange: (f: ColumnFilter | null) => void;
  onToggleType: () => void;
}

function isNumericStats(s: NumericStats | CategoricalStats): s is NumericStats {
  return 'mean' in s;
}

export function FilterControl({ column, stats, filter, onFilterChange, onToggleType }: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasFilter = filter !== undefined && (
    filter.type === 'numeric'
      ? filter.min !== null || filter.max !== null || filter.exact !== null
      : filter.selected.size > 0
  );

  return (
    <div className={`border rounded-lg bg-white ${hasFilter ? 'border-blue-300' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-2 text-left cursor-pointer min-w-0"
        >
          <span className="font-medium text-sm truncate">{column.name}</span>
          {hasFilter && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
          <span className="ml-auto text-gray-400">
            {expanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
          </span>
        </button>
        <ColumnTypeBadge
          type={column.type}
          variant="short"
          onClick={onToggleType}
        />
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2">
          {column.type === 'numeric' && isNumericStats(stats) ? (
            <NumericFilter
              colName={column.name}
              stats={stats}
              filter={filter as NumericFilterType ?? { type: 'numeric', min: null, max: null, exact: null }}
              onChange={onFilterChange}
            />
          ) : (
            <CategoricalFilter
              stats={stats as CategoricalStats}
              filter={filter as CategoricalFilterType ?? { type: 'categorical', selected: new Set() }}
              onChange={onFilterChange}
            />
          )}
          {hasFilter && (
            <button
              type="button"
              onClick={() => onFilterChange(null)}
              className="mt-2 text-xs text-red-500 hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
