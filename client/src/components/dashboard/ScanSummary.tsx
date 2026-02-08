import { Layers, Server, Unlink, CloudCog, Box, Zap } from 'lucide-react';
import { useScanStore } from '../../stores/scan-store';
import { ServiceIcon } from '../shared/ServiceIcon';
import { OrphanedLogGroupAction } from './Actions';

const SERVICE_LABELS: Record<string, string> = {
  ec2: 'EC2',
  rds: 'RDS',
  elb: 'ELB',
  ebs: 'EBS',
  nat: 'NAT',
  eip: 'EIP',
  lambda: 'Lambda',
  s3: 'S3',
  dynamodb: 'DynamoDB',
  vpc: 'VPC',
  cloudwatch: 'CloudWatch',
  sns: 'SNS',
  sqs: 'SQS',
  apigateway: 'API Gateway',
  cloudformation: 'CloudFormation',
};

export function ScanSummary() {
  const { status, resources, totalStacks } = useScanStore();

  if (status === 'idle') {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Box size={20} className="text-accent" />
          <h2 className="text-lg font-semibold">Resources</h2>
        </div>
        <p className="text-sm text-text-secondary">Run a scan to discover resources in your AWS account.</p>
      </div>
    );
  }

  const managed = resources.filter((r) => r.managed).length;
  const loose = resources.filter((r) => !r.managed && r.type !== 'cloudformation-stack').length;
  const stacks = totalStacks;

  // Count by service
  const byService: Record<string, number> = {};
  for (const r of resources) {
    if (r.type === 'cloudformation-stack') continue;
    byService[r.service] = (byService[r.service] ?? 0) + 1;
  }

  const cards = [
    { label: 'Total', value: resources.length, icon: Server, color: 'text-accent' },
    { label: 'Stacks', value: stacks, icon: Layers, color: 'text-cloudformation' },
    { label: 'Managed', value: managed, icon: CloudCog, color: 'text-info' },
    { label: 'Loose', value: loose, icon: Unlink, color: 'text-warning' },
  ];

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center gap-3 mb-5">
        <Box size={20} className="text-accent" />
        <h2 className="text-lg font-semibold">Resources</h2>
        {status === 'scanning' && <span className="text-xs text-text-muted animate-pulse">Scanning...</span>}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-bg-tertiary rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2 whitespace-nowrap">
              <c.icon size={16} className={`${c.color} shrink-0`} />
              <span className="text-xs text-text-muted uppercase tracking-wider">{c.label}</span>
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {Object.keys(byService).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(byService)
            .sort((a, b) => b[1] - a[1])
            .map(([svc, count]) => (
              <div key={svc} className="flex items-center gap-2 bg-bg-tertiary rounded-lg px-3 py-2">
                <ServiceIcon service={svc} size={14} />
                <span className="text-sm text-text-secondary">{SERVICE_LABELS[svc] ?? svc}</span>
                <span className="text-sm font-semibold text-text-primary">{count}</span>
              </div>
            ))}
        </div>
      )}

      {status === 'complete' && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-accent" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium">Actions</span>
          </div>
          <OrphanedLogGroupAction />
        </div>
      )}
    </div>
  );
}
