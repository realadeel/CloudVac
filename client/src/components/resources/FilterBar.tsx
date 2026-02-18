import { Search, X } from 'lucide-react';
import { formatResourceType } from '../../lib/format';

const SERVICES = [
  'ec2', 'rds', 'elb', 'ebs', 'nat', 'eip', 'lambda', 's3',
  'dynamodb', 'vpc', 'cloudwatch', 'sns', 'sqs', 'apigateway', 'cloudformation',
];
const REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ca-central-1',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'ap-southeast-1', 'ap-southeast-2', 'ap-south-1',
  'sa-east-1', 'ap-east-1', 'me-south-1', 'af-south-1',
];

interface Filters {
  search: string;
  services: string[];
  regions: string[];
  types: string[];
  managed: 'all' | 'managed' | 'loose';
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  totalCount: number;
  filteredCount: number;
  resources: { service: string; type: string }[];
}

export function FilterBar({ filters, onChange, totalCount, filteredCount, resources }: Props) {
  const hasActiveFilters =
    filters.search !== '' || filters.services.length > 0 || filters.regions.length > 0 || filters.types.length > 0 || filters.managed !== 'all';
  const isFiltered = hasActiveFilters && filteredCount !== totalCount;

  // Compute available resource types based on current service filter
  const availableTypes = (() => {
    let pool = resources;
    if (filters.services.length > 0) {
      pool = pool.filter((r) => filters.services.includes(r.service));
    }
    const typeSet = new Set(pool.map((r) => r.type));
    return [...typeSet].sort();
  })();
  // Only show type filter when there are multiple types to choose from
  const showTypeFilter = availableTypes.length > 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] sm:min-w-[200px] basis-full sm:basis-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-8 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Service filter */}
        <select
          value={filters.services.length === 0 ? '' : filters.services[0]}
          onChange={(e) => onChange({ ...filters, services: e.target.value ? [e.target.value] : [], types: [] })}
          className={`flex-1 sm:flex-none border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent cursor-pointer ${
            filters.services.length > 0
              ? 'bg-accent/15 border-accent/40 text-accent font-medium'
              : 'bg-bg-tertiary border-border text-text-primary'
          }`}
        >
          <option value="">All Services</option>
          {SERVICES.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </select>

        {/* Resource type filter */}
        {showTypeFilter && (
          <select
            value={filters.types.length === 0 ? '' : filters.types[0]}
            onChange={(e) => onChange({ ...filters, types: e.target.value ? [e.target.value] : [] })}
            className={`flex-1 sm:flex-none border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent cursor-pointer ${
              filters.types.length > 0
                ? 'bg-accent/15 border-accent/40 text-accent font-medium'
                : 'bg-bg-tertiary border-border text-text-primary'
            }`}
          >
            <option value="">All Types</option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {formatResourceType(t)}
              </option>
            ))}
          </select>
        )}

        {/* Region filter */}
        <select
          value={filters.regions.length === 0 ? '' : filters.regions[0]}
          onChange={(e) => onChange({ ...filters, regions: e.target.value ? [e.target.value] : [] })}
          className={`flex-1 sm:flex-none border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent cursor-pointer ${
            filters.regions.length > 0
              ? 'bg-accent/15 border-accent/40 text-accent font-medium'
              : 'bg-bg-tertiary border-border text-text-primary'
          }`}
        >
          <option value="">All Regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* Managed / Loose toggle */}
        <div className="flex bg-bg-tertiary border border-border rounded-lg overflow-hidden">
          {(['all', 'managed', 'loose'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onChange({ ...filters, managed: opt })}
              className={`px-2.5 sm:px-3 py-2 text-xs sm:text-sm capitalize transition-colors ${
                filters.managed === opt
                  ? 'bg-accent/20 text-accent font-medium'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={() => onChange({ search: '', services: [], regions: [], types: [], managed: 'all' })}
            className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <X size={13} />
            Clear
          </button>
        )}
      </div>

      {/* Active filter summary */}
      {isFiltered && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-text-muted">
            Showing {filteredCount} of {totalCount}
          </span>
          {filters.services.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-0.5 font-medium bg-accent/15 text-accent rounded border border-accent/30"
            >
              {s.toUpperCase()}
              <button onClick={() => onChange({ ...filters, services: filters.services.filter((x) => x !== s), types: [] })}>
                <X size={11} />
              </button>
            </span>
          ))}
          {filters.types.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 font-medium bg-info/15 text-info rounded border border-info/30"
            >
              {formatResourceType(t)}
              <button onClick={() => onChange({ ...filters, types: filters.types.filter((x) => x !== t) })}>
                <X size={11} />
              </button>
            </span>
          ))}
          {filters.regions.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 px-2 py-0.5 font-medium bg-accent/15 text-accent rounded border border-accent/30"
            >
              {r}
              <button onClick={() => onChange({ ...filters, regions: filters.regions.filter((x) => x !== r) })}>
                <X size={11} />
              </button>
            </span>
          ))}
          {filters.managed !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 font-medium bg-accent/15 text-accent rounded border border-accent/30">
              {filters.managed}
              <button onClick={() => onChange({ ...filters, managed: 'all' })}>
                <X size={11} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export type { Filters };
