import { Search, X } from 'lucide-react';

const SERVICES = ['ec2', 'rds', 'elb', 'ebs', 'nat', 'eip', 'lambda', 's3', 'cloudformation'];
const REGIONS = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2'];

interface Filters {
  search: string;
  services: string[];
  regions: string[];
  managed: 'all' | 'managed' | 'loose';
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function FilterBar({ filters, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search resources..."
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

      <select
        value={filters.services.length === 0 ? '' : filters.services[0]}
        onChange={(e) => onChange({ ...filters, services: e.target.value ? [e.target.value] : [] })}
        className="bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
      >
        <option value="">All Services</option>
        {SERVICES.map((s) => (
          <option key={s} value={s}>{s.toUpperCase()}</option>
        ))}
      </select>

      <select
        value={filters.regions.length === 0 ? '' : filters.regions[0]}
        onChange={(e) => onChange({ ...filters, regions: e.target.value ? [e.target.value] : [] })}
        className="bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
      >
        <option value="">All Regions</option>
        {REGIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <div className="flex bg-bg-tertiary border border-border rounded-lg overflow-hidden">
        {(['all', 'managed', 'loose'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => onChange({ ...filters, managed: opt })}
            className={`px-3 py-2 text-sm capitalize transition-colors ${
              filters.managed === opt
                ? 'bg-accent/20 text-accent font-medium'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export type { Filters };
