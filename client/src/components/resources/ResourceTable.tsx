import { useState } from 'react';
import { ArrowUpDown, ChevronRight, Trash2, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScanStore } from '../../stores/scan-store';
import { useDeletionStore } from '../../stores/deletion-store';
import { ServiceIcon } from '../shared/ServiceIcon';
import { Badge } from '../shared/Badge';
import { formatRelativeDate, truncate } from '../../lib/format';
import { FilterBar, type Filters } from './FilterBar';
import { ResourceDetail } from './ResourceDetail';
import { EmptyState } from '../shared/EmptyState';

type SortKey = 'name' | 'service' | 'region' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: 'name', label: 'Resource', className: 'w-[40%]' },
  { key: 'service', label: 'Service', className: 'w-[12%]' },
  { key: 'region', label: 'Region', className: 'w-[14%]' },
  { key: 'status', label: 'Status', className: 'w-[16%]' },
  { key: 'createdAt', label: 'Created', className: 'w-[12%]' },
];

export function ResourceTable() {
  const resources = useScanStore((s) => s.resources);
  const scanStatus = useScanStore((s) => s.status);
  const queue = useDeletionStore((s) => s.queue);
  const addToQueue = useDeletionStore((s) => s.addToQueue);
  const removeFromQueue = useDeletionStore((s) => s.removeFromQueue);
  const removeMultipleFromQueue = useDeletionStore((s) => s.removeMultipleFromQueue);
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>({ search: '', services: [], regions: [], managed: 'all' });
  const [sortKey, setSortKey] = useState<SortKey>('service');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Apply filters — computed every render (no useMemo) to avoid stale cache issues
  let filtered = resources;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }
  if (filters.services.length > 0) {
    filtered = filtered.filter((r) => filters.services.includes(r.service));
  }
  if (filters.regions.length > 0) {
    filtered = filtered.filter((r) => filters.regions.includes(r.region));
  }
  if (filters.managed === 'managed') {
    filtered = filtered.filter((r) => r.managed);
  } else if (filters.managed === 'loose') {
    filtered = filtered.filter((r) => !r.managed && r.type !== 'cloudformation-stack');
  }
  filtered = [...filtered].sort((a, b) => {
    const av = (a as any)[sortKey] ?? '';
    const bv = (b as any)[sortKey] ?? '';
    const cmp = String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Selection tracking
  const selectedOnPage = new Set(filtered.filter((r) => queue.includes(r.id)).map((r) => r.id));
  const allSelectedOnPage = filtered.length > 0 && selectedOnPage.size === filtered.length;
  const someSelectedOnPage = selectedOnPage.size > 0 && !allSelectedOnPage;

  const toggleAll = () => {
    if (allSelectedOnPage) {
      removeMultipleFromQueue(filtered.map((r) => r.id));
    } else {
      addToQueue(filtered.map((r) => r.id));
    }
  };

  const selectedResource = selectedId ? resources.find((r) => r.id === selectedId) : null;

  if (scanStatus === 'idle') {
    return (
      <EmptyState
        icon={<Server size={48} />}
        title="No resources scanned"
        description="Select a profile and click Scan Account to discover resources."
      />
    );
  }

  return (
    <div>
      {/* Toolbar: filters + bulk action */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex-1">
          <FilterBar filters={filters} onChange={setFilters} totalCount={resources.length} filteredCount={filtered.length} />
        </div>
        {selectedOnPage.size > 0 && (
          <button
            onClick={() => navigate('/deletion')}
            className="flex items-center gap-2 px-4 py-2 bg-danger/15 hover:bg-danger/25 text-danger text-sm font-medium rounded-lg border border-danger/30 transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 size={15} />
            Delete {selectedOnPage.size} selected
          </button>
        )}
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        {/* Header row */}
        <div className="flex items-center px-3 py-2.5 border-b border-border bg-bg-tertiary/50 text-[11px] font-medium text-text-muted uppercase tracking-wider">
          <div className="w-9 shrink-0 pl-1">
            <input
              type="checkbox"
              checked={allSelectedOnPage}
              ref={(el) => {
                if (el) el.indeterminate = someSelectedOnPage;
              }}
              onChange={toggleAll}
              className="rounded border-border accent-accent"
            />
          </div>
          {COLUMNS.map((col) => (
            <button
              key={col.key}
              onClick={() => toggleSort(col.key)}
              className={`flex items-center gap-1 hover:text-text-primary transition-colors ${col.className}`}
            >
              {col.label}
              <ArrowUpDown size={11} className={sortKey === col.key ? 'text-accent' : 'opacity-30'} />
            </button>
          ))}
          <div className="w-6 shrink-0" />
        </div>

        {/* Rows */}
        <div key={`rows-${filtered.length}-${filters.services.join()}-${filters.regions.join()}-${filters.managed}-${filters.search}`} className="max-h-[calc(100vh-280px)] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-text-muted">No resources match your filters.</div>
          ) : (
            <div>
              {filtered.map((r) => {
                const inQueue = queue.includes(r.id);
                const statusLabel = r.status.split(':')[0].replace(/_/g, ' ');
                return (
                  <div
                    key={r.id}
                    className={`flex items-center px-3 py-2 border-b border-border/40 hover:bg-bg-hover/50 transition-colors cursor-pointer ${
                      inQueue ? 'bg-accent/5' : ''
                    }`}
                    onClick={() => setSelectedId(r.id)}
                  >
                    {/* Checkbox */}
                    <div className="w-9 shrink-0 pl-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={inQueue}
                        onChange={() => (inQueue ? removeFromQueue(r.id) : addToQueue([r.id]))}
                        className="rounded border-border accent-accent"
                      />
                    </div>

                    {/* Resource name + badge */}
                    <div className="w-[40%] min-w-0 flex items-center gap-2">
                      <ServiceIcon service={r.service} size={15} className="shrink-0" />
                      <span className="text-sm font-medium text-text-primary truncate">
                        {truncate(r.name, 32)}
                      </span>
                      {r.managed ? (
                        <Badge label="CF" variant="managed" />
                      ) : r.type !== 'cloudformation-stack' ? (
                        <Badge label="Loose" variant="loose" />
                      ) : null}
                    </div>

                    {/* Service */}
                    <div className="w-[12%] text-xs text-text-secondary">{r.service}</div>

                    {/* Region */}
                    <div className="w-[14%] text-xs text-text-secondary">{r.region}</div>

                    {/* Status */}
                    <div className="w-[16%]">
                      <Badge label={truncate(statusLabel, 18)} />
                    </div>

                    {/* Created */}
                    <div className="w-[12%] text-xs text-text-secondary">{formatRelativeDate(r.createdAt)}</div>

                    {/* Chevron */}
                    <div className="w-6 shrink-0 text-text-muted">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-bg-tertiary/50 flex items-center justify-between">
          <span className="text-xs text-text-muted">{filtered.length} resource(s)</span>
          {queue.length > 0 && (
            <button
              onClick={() => navigate('/deletion')}
              className="text-xs text-accent font-medium hover:text-accent-hover transition-colors"
            >
              {queue.length} in deletion queue →
            </button>
          )}
        </div>
      </div>

      {selectedResource && <ResourceDetail resource={selectedResource} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
