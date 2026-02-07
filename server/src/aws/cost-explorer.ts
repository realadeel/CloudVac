import { GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import type { AWSProfile } from '../../../shared/types.js';
import type { CostSummary } from '../../../shared/types.js';
import * as clients from './clients.js';

export async function getCostSummary(profile: AWSProfile): Promise<CostSummary> {
  const client = clients.costExplorer(profile);

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const resp = await client.send(
    new GetCostAndUsageCommand({
      TimePeriod: { Start: fmt(start), End: fmt(end) },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    })
  );

  const byService: CostSummary['byService'] = [];
  let total = 0;

  for (const result of resp.ResultsByTime ?? []) {
    for (const group of result.Groups ?? []) {
      const service = group.Keys?.[0] ?? 'Unknown';
      const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? '0');
      const currency = group.Metrics?.UnblendedCost?.Unit ?? 'USD';
      if (amount > 0.001) {
        const existing = byService.find((s) => s.service === service);
        if (existing) {
          existing.amount += amount;
        } else {
          byService.push({ service, amount, currency });
        }
        total += amount;
      }
    }
  }

  byService.sort((a, b) => b.amount - a.amount);

  return {
    period: { start: fmt(start), end: fmt(end) },
    total: Math.round(total * 100) / 100,
    byService: byService.map((s) => ({ ...s, amount: Math.round(s.amount * 100) / 100 })),
  };
}
