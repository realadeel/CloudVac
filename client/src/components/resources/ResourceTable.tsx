import { useState, useMemo } from 'react';
import { ArrowUpDown, ChevronRight } from 'lucide-react';
import { useScanStore } from '../../stores/scan-store';
import { useDeletionStore } from '../../stores/deletion-store';
import { ServiceIcon } from '../shared/ServiceIcon';
import { Badge } from '../shared/Badge';
import { formatRelativeDate, truncate } from '../../lib/format';
import { FilterBar, type Filters } from './FilterBar';
import { ResourceDetail } from './ResourceDetail';
import { EmptyState } from '../shared/EmptyState';
import { Server } from 'lucide-react';

type SortKey = 'name' | 'service' | 'region' | 'status' | 'createdAt' | 'type';
type SortDir = 'asc' | 'desc';

export function ResourceTable() {
  const resources = useScanStore((s) => s.resources);
  const scanStatus = useScanStore((s) => s.status);
  const { queue, addToQueue, removeFromQueue } = useDeletionStore();

  const [filters, setFilters] = useState<Filters>({ search: '', services: [], regions: [], managed: 'all' });
  const [sortKey, setSortKey] = useState<SortKey>('service');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = resources;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
    }
    if (filters.services.length > 0) {
      list = list.filter((r) => filters.services.includes(r.service));
    }
    if (filters.regions.length > 0) {
      list = list.filter((r) => filters.regions.includes(r.region));
    }
    if (filters.managed === 'managed') {
      list = list.filter((r) => r.managed);
    } else if (filters.managed === 'loose') {
      list = list.filter((r) => !r.managed && r.type !== 'cloudformation-stack');
    }

    list = [...list].sort((a, b) => {
      const av = (a as any)[sortKey] ?? '';
      const bv = (b as any)[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [resources, filters, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const allSelectedOnPage = filtered.length > 0 && filtered.every((r) => queue.includes(r.id));
  const toggleAll = () => {
    if (allSelectedOnPage) {
      for (const r of filtered) removeFromQueue(r.id);
    } else {
      addToQueue(filtered.map((r) => r.id));
    }
  };

  const selectedResource = selectedId ? resources.find((r) => r.id === selectedId) : null;

  if (scanStatus === 'idle') {
    return <EmptyState icon={<Server size={48} />} title="No resources scanned" description="Select a profile and click Scan Account to discover resources." />;
  }

  const headers: { key: SortKey; label: string; width?: string }[] = [
    { key: 'name', label: 'Resource', width: 'flex-1' },
    { key: 'type', label: 'Type' },
    { key: 'service', label: 'Service' },
    { key: 'region', label: 'Region' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created' },
  ];

  return (
    <div>
      <div className="mb-4">
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-bg-tertiary/50 text-xs font-medium text-text-muted uppercase tracking-wider">
          <div className="w-10">
            <input
              type="checkbox"
              checked={allSelectedOnPage}
              onChange={toggleAll}
              className="rounded border-border accent-accent"
            />
          </div>
          {headers.map((h) => (
            <button
              key={h.key}
              onClick={() => toggleSort(h.key)}
              className={`flex items-center gap-1 hover:text-text-primary transition-colors ${h.width ?? 'w-28'}`}
            >
              {h.label}
              <ArrowUpDown size={12} className={sortKey === h.key ? 'text-accent' : 'opacity-30'} />
            </button>
          ))}
          <div className="w-10" />
        </div>

        {/* Rows */}
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-text-muted">
              No resources match your filters.
            </div>
          ) : (
            filtered.map((r) => {
              const selected = queue.includes(r.id);
              return (
                <div
                  key={r.id}
                  className={`flex items-center px-4 py-3 border-b border-border/50 hover:bg-bg-hover/50 transition-colors cursor-pointer ${
                    selected ? 'bg-accent/5' : ''
                  }`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <div className="w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => (selected ? removeFromQueue(r.id) : addToQueue([r.id]))}
                      className="rounded border-border accent-accent"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ServiceIcon service={r.service} size={14} />
                      <span className="text-sm font-medium text-text-primary truncate">{truncate(r.name, 40)}</span>
                      {r.managed && <Badge label="Managed" variant="managed" />}
                      {!r.managed && r.type !== 'cloudformation-stack' && <Badge label="Loose" variant="loose" />}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 truncate">{r.id}</p>
                  </div>
                  <div className="w-28 text-xs text-text-secondary">{r.type}</div>
                  <div className="w-28 text-xs text-text-secondary">{r.service}</div>
                  <div className="w-28 text-xs text-text-secondary">{r.region}</div>
                  <div className="w-28"><Badge label={r.status.split(':')[0]} /></div>
                  <div className="w-28 text-xs text-text-secondary">{formatRelativeDate(r.createdAt)}</div>
                  <div className="w-10 text-text-muted">
                    <ChevronRight size={16} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-bg-tertiary/50 flex items-center justify-between">
          <span className="text-xs text-text-muted">{filtered.length} resource(s)</span>
          {queue.length > 0 && (
            <span className="text-xs text-accent font-medium">{queue.length} selected for deletion</span>
          )}
        </div>
      </div>

      {selectedResource && (
        <ResourceDetail resource={selectedResource} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
