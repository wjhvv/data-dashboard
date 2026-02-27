import { useState, useMemo, useCallback, useDeferredValue, useTransition } from 'react';
import type { CellValue } from '../utils/dataUtils';
import {
  computeNumericStats,
  computeNumericBins,
  computeCategoricalStats,
} from '../utils/histogramBinner';
import type { NumericStats, CategoricalStats, BinEntry } from '../utils/histogramBinner';

export type ColumnType = 'numeric' | 'categorical';

export interface NumericFilter {
  type: 'numeric';
  min: number | null;
  max: number | null;
  exact: number | null;
}

export interface CategoricalFilter {
  type: 'categorical';
  selected: Set<string>;
}

export type ColumnFilter = NumericFilter | CategoricalFilter;

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  overridden: boolean;
}

export interface DataStore {
  headers: string[];
  rows: CellValue[][];
  columns: ColumnMeta[];
  filterMap: Record<string, ColumnFilter>;
  typeOverrides: Record<string, ColumnType>;
  filteredRows: CellValue[][];
  deferredRows: CellValue[][];
  isStale: boolean;
  columnStatsMap: Record<string, NumericStats | CategoricalStats>;
  rawColumnStatsMap: Record<string, NumericStats | CategoricalStats>;
  histogramBinsMap: Record<string, BinEntry[]>;
  loadFile: (file: File) => Promise<void>;
  setFilter: (colName: string, filter: ColumnFilter | null) => void;
  clearAllFilters: () => void;
  toggleColumnType: (colName: string) => void;
}

function detectType(values: CellValue[]): ColumnType {
  let numCount = 0;
  let total = 0;
  for (const v of values) {
    if (v === null || v === '') continue;
    total++;
    if (!isNaN(Number(v))) numCount++;
  }
  if (total === 0) return 'categorical';
  return numCount / total >= 0.8 ? 'numeric' : 'categorical';
}

function applyFilters(
  rows: CellValue[][],
  headers: string[],
  filterMap: Record<string, ColumnFilter>,
  columns: ColumnMeta[]
): CellValue[][] {
  const activeFilters = Object.entries(filterMap).filter(([, f]) => {
    if (f.type === 'numeric') return f.min !== null || f.max !== null || f.exact !== null;
    return f.selected.size > 0;
  });
  if (activeFilters.length === 0) return rows;

  return rows.filter((row) => {
    for (const [colName, filter] of activeFilters) {
      const idx = headers.indexOf(colName);
      if (idx < 0) continue;
      const col = columns.find((c) => c.name === colName);
      const v = row[idx];

      if (filter.type === 'numeric') {
        const n = v === null || v === '' ? null : Number(v);
        if (n === null) return false;
        if (filter.exact !== null && n !== filter.exact) return false;
        if (filter.min !== null && n < filter.min) return false;
        if (filter.max !== null && n > filter.max) return false;
      } else {
        const label = v === null || v === '' ? '(empty)' : String(v);
        if (!filter.selected.has(label)) return false;
      }
      void col; // col used for future type-aware logic
    }
    return true;
  });
}

export function useDataStore(): DataStore {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CellValue[][]>([]);
  const [typeOverrides, setTypeOverrides] = useState<Record<string, ColumnType>>({});
  const [filterMap, setFilterMap] = useState<Record<string, ColumnFilter>>({});
  const [, startTransition] = useTransition();

  const autoColumns = useMemo<ColumnMeta[]>(() => {
    if (headers.length === 0) return [];
    return headers.map((name, idx) => {
      const values = rows.map((r) => r[idx]);
      return { name, type: detectType(values), overridden: false };
    });
  }, [headers, rows]);

  const columns = useMemo<ColumnMeta[]>(() => {
    return autoColumns.map((c) => {
      const override = typeOverrides[c.name];
      if (override) return { ...c, type: override, overridden: true };
      return c;
    });
  }, [autoColumns, typeOverrides]);

  const filteredRows = useMemo(
    () => applyFilters(rows, headers, filterMap, columns),
    [rows, headers, filterMap, columns]
  );

  const deferredRows = useDeferredValue(filteredRows);
  const isStale = deferredRows !== filteredRows;

  const columnStatsMap = useMemo(() => {
    const map: Record<string, NumericStats | CategoricalStats> = {};
    for (const col of columns) {
      const idx = headers.indexOf(col.name);
      if (idx < 0) continue;
      const values = deferredRows.map((r) => r[idx]);
      map[col.name] =
        col.type === 'numeric' ? computeNumericStats(values) : computeCategoricalStats(values);
    }
    return map;
  }, [columns, headers, deferredRows]);

  // Stats from unfiltered rows — used for filter popovers so categories don't disappear
  const rawColumnStatsMap = useMemo(() => {
    const map: Record<string, NumericStats | CategoricalStats> = {};
    for (const col of columns) {
      const idx = headers.indexOf(col.name);
      if (idx < 0) continue;
      const values = rows.map((r) => r[idx]);
      map[col.name] =
        col.type === 'numeric' ? computeNumericStats(values) : computeCategoricalStats(values);
    }
    return map;
  }, [columns, headers, rows]);

  const histogramBinsMap = useMemo(() => {
    const map: Record<string, BinEntry[]> = {};
    for (const col of columns) {
      if (col.type !== 'numeric') continue;
      const idx = headers.indexOf(col.name);
      if (idx < 0) continue;
      const values = deferredRows.map((r) => r[idx]);
      map[col.name] = computeNumericBins(values);
    }
    return map;
  }, [columns, headers, deferredRows]);

  const loadFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let parsedHeaders: string[] = [];
    let parsedRows: CellValue[][] = [];

    if (ext === 'csv') {
      const text = await file.text();
      const { default: Papa } = await import('papaparse');
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      });
      parsedHeaders = result.meta.fields ?? [];
      parsedRows = result.data.map((row) =>
        parsedHeaders.map((h) => {
          const v = row[h];
          return v === undefined || v === '' ? null : v;
        })
      );
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buf = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
      parsedHeaders = (data[0] as string[]).map(String);
      parsedRows = data.slice(1).map((row) =>
        parsedHeaders.map((_, i) => {
          const v = (row as CellValue[])[i];
          return v === undefined || v === '' ? null : v;
        })
      );
    }

    startTransition(() => {
      setHeaders(parsedHeaders);
      setRows(parsedRows);
      setTypeOverrides({});
      setFilterMap({});
    });
  }, []);

  const setFilter = useCallback((colName: string, filter: ColumnFilter | null) => {
    setFilterMap((prev) => {
      const next = { ...prev };
      if (filter === null) delete next[colName];
      else next[colName] = filter;
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterMap({});
  }, []);

  const toggleColumnType = useCallback(
    (colName: string) => {
      const current = columns.find((c) => c.name === colName)?.type;
      const next: ColumnType = current === 'numeric' ? 'categorical' : 'numeric';
      setTypeOverrides((prev) => ({ ...prev, [colName]: next }));
      setFilterMap((prev) => {
        const next = { ...prev };
        delete next[colName];
        return next;
      });
    },
    [columns]
  );

  return {
    headers,
    rows,
    columns,
    filterMap,
    typeOverrides,
    filteredRows,
    deferredRows,
    isStale,
    columnStatsMap,
    rawColumnStatsMap,
    histogramBinsMap,
    loadFile,
    setFilter,
    clearAllFilters,
    toggleColumnType,
  };
}
