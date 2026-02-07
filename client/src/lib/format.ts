export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 1) + '\u2026';
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / 1024 ** i;
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${BYTE_UNITS[i]}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  'ec2-instance': 'EC2 Instance',
  'rds-instance': 'RDS Instance',
  'rds-cluster': 'RDS Cluster',
  'alb': 'ALB',
  'nlb': 'NLB',
  'clb': 'CLB',
  'ebs-volume': 'EBS Volume',
  'nat-gateway': 'NAT Gateway',
  'elastic-ip': 'Elastic IP',
  'lambda-function': 'Lambda Function',
  's3-bucket': 'S3 Bucket',
  'dynamodb-table': 'DynamoDB Table',
  'vpc': 'VPC',
  'subnet': 'Subnet',
  'security-group': 'Security Group',
  'internet-gateway': 'Internet Gateway',
  'route-table': 'Route Table',
  'cloudwatch-log-group': 'Log Group',
  'cloudwatch-alarm': 'Alarm',
  'sns-topic': 'SNS Topic',
  'sqs-queue': 'SQS Queue',
  'apigateway-rest-api': 'REST API',
  'apigateway-http-api': 'HTTP API',
  'cloudformation-stack': 'CF Stack',
};

export function formatResourceType(type: string): string {
  return RESOURCE_TYPE_LABELS[type] ?? type;
}
