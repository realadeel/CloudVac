export const REGIONS = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2'] as const;
export type Region = (typeof REGIONS)[number];

export const SCANNABLE_SERVICES = ['ec2', 'rds', 'elb', 'ebs', 'nat', 'eip', 'lambda', 's3'] as const;
export type ScannableService = (typeof SCANNABLE_SERVICES)[number];

export const SERVICE_COLORS: Record<string, string> = {
  ec2: '#f97316',
  rds: '#3b82f6',
  s3: '#22c55e',
  lambda: '#a855f7',
  elb: '#06b6d4',
  ebs: '#eab308',
  nat: '#ec4899',
  eip: '#14b8a6',
  cloudformation: '#6366f1',
};

export const PORT = 3001;
export const SCAN_CONCURRENCY = 5;
export const DELETE_CONCURRENCY = 3;
