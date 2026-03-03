import { useMemo } from 'react';
import type { CategoricalFilter as CategoricalFilterType } from '../../hooks/useDataStore';
import type { CategoricalStats } from '../../utils/histogramBinner';
import { CheckboxList } from '../CheckboxList';

interface Props {
  stats: CategoricalStats;
  filter: CategoricalFilterType;
  onChange: (f: CategoricalFilterType) => void;
}

export function CategoricalFilter({ stats, filter, onChange }: Props) {
  const sortedEntries = useMemo(() => {
    const entries = Array.from(stats.counts.entries());
    const allNumeric = entries.length > 0 &&
      entries.every(([k]) => k === '(empty)' || !isNaN(Number(k)));
    if (allNumeric) {
      return entries.sort((a, b) => {
        if (a[0] === '(empty)') return 1;
        if (b[0] === '(empty)') return -1;
        return Number(a[0]) - Number(b[0]);
      });
    }
    return entries.sort((a, b) => b[1] - a[1]);
  }, [stats.counts]);

  const allKeys = useMemo(() => sortedEntries.map(([k]) => k), [sortedEntries]);

  // null = no filter (all pass); Set (even empty) = explicit inclusion list
  const noFilter = filter.selected === null;
  const isChecked = (key: string) => noFilter || filter.selected!.has(key);

  const toggle = (key: string) => {
    if (noFilter) {
      const next = new Set(allKeys);
      next.delete(key);
      onChange({ type: 'categorical', selected: next });
    } else {
      const next = new Set(filter.selected!);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onChange({ type: 'categorical', selected: next.size >= allKeys.length ? null : next });
    }
  };

  const handleAll = (visibleKeys: string[]) => {
    if (noFilter) return;
    const next = new Set([...filter.selected!, ...visibleKeys]);
    onChange({ type: 'categorical', selected: next.size >= allKeys.length ? null : next });
  };

  const handleNone = (visibleKeys: string[]) => {
    const current = noFilter ? new Set(allKeys) : new Set(filter.selected!);
    const visSet = new Set(visibleKeys);
    const next = new Set([...current].filter((k) => !visSet.has(k)));
    onChange({ type: 'categorical', selected: next });
  };

  const items = sortedEntries.map(([key, count]) => ({ key, count }));
  const activeCount = noFilter ? allKeys.length : filter.selected!.size;

  return (
    <CheckboxList
      items={items}
      isChecked={isChecked}
      onToggle={toggle}
      onAll={handleAll}
      onNone={handleNone}
      activeCount={activeCount}
      totalCount={allKeys.length}
      countLabel="selected"
      showSearch={sortedEntries.length >= 10}
    />
  );
}
