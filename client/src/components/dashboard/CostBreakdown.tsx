import { useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { useCostStore } from '../../stores/cost-store';
import { useProfileStore } from '../../stores/profile-store';
import { formatCurrency } from '../../lib/format';
import { Spinner } from '../shared/Spinner';

const SERVICE_COLORS: Record<string, string> = {
  'Amazon Elastic Compute Cloud': '#f97316',
  'Amazon Relational Database Service': '#3b82f6',
  'Amazon Simple Storage Service': '#22c55e',
  'AWS Lambda': '#a855f7',
  'Elastic Load Balancing': '#06b6d4',
  'Amazon EC2 Container Service': '#ec4899',
  'Amazon CloudFront': '#14b8a6',
  'Amazon Route 53': '#eab308',
  'Amazon DynamoDB': '#6366f1',
  'AWS CloudFormation': '#8b5cf6',
};

function getColor(service: string, idx: number): string {
  for (const [key, color] of Object.entries(SERVICE_COLORS)) {
    if (service.includes(key) || key.includes(service)) return color;
  }
  const fallback = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#06b6d4', '#ec4899', '#14b8a6', '#eab308'];
  return fallback[idx % fallback.length];
}

function shortName(service: string): string {
  return service
    .replace(/^Amazon /, '')
    .replace(/^AWS /, '')
    .replace(/ - Compute$/, '')
    .replace(/ Service$/, '');
}

export function CostBreakdown() {
  const profile = useProfileStore((s) => s.selectedProfile);
  const { total, byService, loading, error, fetchCosts } = useCostStore();

  useEffect(() => {
    if (profile) fetchCosts(profile);
  }, [profile, fetchCosts]);

  if (loading) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign size={20} className="text-accent" />
          <h2 className="text-lg font-semibold">Cost Breakdown</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign size={20} className="text-accent" />
          <h2 className="text-lg font-semibold">Cost Breakdown</h2>
        </div>
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  const maxCost = byService.length > 0 ? byService[0].amount : 0;

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign size={20} className="text-accent" />
          <h2 className="text-lg font-semibold">Cost Breakdown</h2>
          <span className="text-sm text-text-muted">Last 30 days</span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-text-primary">{formatCurrency(total)}</p>
          <p className="text-xs text-text-muted">Total spend</p>
        </div>
      </div>

      {byService.length === 0 ? (
        <p className="text-sm text-text-secondary">No cost data available. Select a profile and scan.</p>
      ) : (
        <div className="space-y-3">
          {byService.slice(0, 12).map((s, i) => {
            const pct = maxCost > 0 ? (s.amount / maxCost) * 100 : 0;
            const color = getColor(s.service, i);
            return (
              <div key={s.service} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors truncate mr-4">
                    {shortName(s.service)}
                  </span>
                  <span className="text-sm font-medium text-text-primary whitespace-nowrap">{formatCurrency(s.amount)}</span>
                </div>
                <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-text-muted/60 pt-2">Estimates are approximate. Consult AWS pricing for exact rates.</p>
        </div>
      )}
    </div>
  );
}
