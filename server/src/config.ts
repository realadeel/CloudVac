export const REGIONS = [
  'us-east-1',        // N. Virginia
  'us-east-2',        // Ohio
  'us-west-1',        // N. California
  'us-west-2',        // Oregon
  'ca-central-1',     // Canada
  'eu-west-1',        // Ireland
  'eu-west-2',        // London
  'eu-west-3',        // Paris
  'eu-central-1',     // Frankfurt
  'eu-north-1',       // Stockholm
  'ap-northeast-1',   // Tokyo
  'ap-northeast-2',   // Seoul
  'ap-northeast-3',   // Osaka
  'ap-southeast-1',   // Singapore
  'ap-southeast-2',   // Sydney
  'ap-south-1',       // Mumbai
  'sa-east-1',        // São Paulo
  'ap-east-1',        // Hong Kong
  'me-south-1',       // Bahrain
  'af-south-1',       // Cape Town
] as const;
export type Region = (typeof REGIONS)[number];

export const SCANNABLE_SERVICES = [
  'ec2', 'rds', 'elb', 'ebs', 'nat', 'eip', 'lambda', 's3',
  'dynamodb', 'vpc', 'cloudwatch', 'sns', 'sqs', 'apigateway',
] as const;
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
  dynamodb: '#f59e0b',
  vpc: '#8b5cf6',
  cloudwatch: '#10b981',
  sns: '#e11d48',
  sqs: '#d946ef',
  apigateway: '#0ea5e9',
};

export const PORT = 3001;
export const SCAN_CONCURRENCY = 8;
export const DELETE_CONCURRENCY = 3;
