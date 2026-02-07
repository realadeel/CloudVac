import { CostBreakdown } from '../components/dashboard/CostBreakdown';
import { ScanSummary } from '../components/dashboard/ScanSummary';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CostBreakdown />
        <ScanSummary />
      </div>
    </div>
  );
}
