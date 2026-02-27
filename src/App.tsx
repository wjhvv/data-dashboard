import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDataStore } from './hooks/useDataStore';
import { DataTable } from './components/DataTable/DataTable';
import { AnalysisPanel } from './components/Analysis/AnalysisPanel';
import { RelationshipsPanel } from './components/Charts/RelationshipsPanel';
import { ChevronDownIcon, ChevronUpIcon, XIcon } from './components/icons';

function FileUpload({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 bg-white'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div className="text-5xl mb-4">📊</div>
      <div className="text-lg font-semibold text-gray-700 mb-1">Upload your data file</div>
      <div className="text-sm text-gray-500">Drag and drop or click to select CSV / XLSX</div>
    </div>
  );
}

export default function App() {
  const store = useDataStore();
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const [analysisCollapsed, setAnalysisCollapsed] = useState(false);
  const [relationshipsCollapsed, setRelationshipsCollapsed] = useState(false);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  useEffect(() => {
    if (!analysisExpanded) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setAnalysisExpanded(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [analysisExpanded]);

  const hasData = store.headers.length > 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <span className="text-lg font-bold text-gray-800">Data Dashboard</span>
        {hasData && (
          <span className="text-sm text-gray-500 ml-2">
            {store.rows.length.toLocaleString()} rows × {store.headers.length} columns
            {store.filteredRows.length !== store.rows.length && (
              <span className="text-blue-600 ml-1">
                ({store.filteredRows.length.toLocaleString()} filtered)
              </span>
            )}
          </span>
        )}
        {hasData && (
          <label className="ml-auto flex items-center gap-2 cursor-pointer text-sm text-gray-600 border rounded-lg px-3 py-1.5 hover:bg-gray-50 bg-white">
            <span>Load new file</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) store.loadFile(file);
              }}
            />
          </label>
        )}
      </header>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-lg">
            <FileUpload onFile={store.loadFile} />
          </div>
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
              {/* Data table section */}
              <section className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-800">Data Table</h2>
                  <button
                    type="button"
                    onClick={() => setTableCollapsed((v) => !v)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {tableCollapsed ? <ChevronDownIcon size={16} /> : <ChevronUpIcon size={16} />}
                    {tableCollapsed ? 'Show' : 'Hide'}
                  </button>
                </div>
                {!tableCollapsed && (
                  <DataTable
                    headers={store.headers}
                    rows={store.filteredRows}
                    totalRows={store.rows.length}
                    columns={store.columns}
                    rawColumnStatsMap={store.rawColumnStatsMap}
                    filterMap={store.filterMap}
                    onFilterChange={store.setFilter}
                    onToggleType={store.toggleColumnType}
                    onClearAllFilters={store.clearAllFilters}
                  />
                )}
              </section>

              {/* Analysis section */}
              <section className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-800">Column Analysis</h2>
                    {store.isStale && (
                      <span className="text-xs text-gray-400 italic">Updating…</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnalysisCollapsed((v) => !v)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {analysisCollapsed ? <ChevronDownIcon size={16} /> : <ChevronUpIcon size={16} />}
                    {analysisCollapsed ? 'Show' : 'Hide'}
                  </button>
                </div>
                {!analysisCollapsed && (
                  <AnalysisPanel
                    columns={store.columns}
                    columnStatsMap={store.columnStatsMap}
                    histogramBinsMap={store.histogramBinsMap}
                    rows={store.deferredRows}
                    headers={store.headers}
                    onToggleType={store.toggleColumnType}
                    isStale={store.isStale}
                    onExpand={() => setAnalysisExpanded(true)}
                  />
                )}
              </section>

              {/* Relationships section */}
              <section className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800">Relationships</h2>
                  <button
                    type="button"
                    onClick={() => setRelationshipsCollapsed((v) => !v)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {relationshipsCollapsed ? <ChevronDownIcon size={16} /> : <ChevronUpIcon size={16} />}
                    {relationshipsCollapsed ? 'Show' : 'Hide'}
                  </button>
                </div>
                {!relationshipsCollapsed && (
                  <RelationshipsPanel
                    columns={store.columns}
                    rows={store.deferredRows}
                    headers={store.headers}
                  />
                )}
              </section>

              {/* Analysis fullscreen modal */}
              {analysisExpanded && createPortal(
                <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
                  <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">Column Analysis — Fullscreen</span>
                      {store.isStale && (
                        <span className="text-xs text-gray-400 italic">Updating…</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnalysisExpanded(false)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer p-1.5 rounded hover:bg-gray-100"
                      title="Close (Esc)"
                    >
                      <XIcon size={16} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                    <AnalysisPanel
                      columns={store.columns}
                      columnStatsMap={store.columnStatsMap}
                      histogramBinsMap={store.histogramBinsMap}
                      rows={store.deferredRows}
                      headers={store.headers}
                      onToggleType={store.toggleColumnType}
                      isStale={store.isStale}
                    />
                  </div>
                </div>,
                document.body
              )}
            </div>
          </main>
      )}
    </div>
  );
}
