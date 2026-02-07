export interface AWSProfile {
  name: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region?: string;
}

export interface ProfileInfo {
  name: string;
  region: string | null;
}

export type ServiceType = 'ec2' | 'rds' | 'elb' | 'ebs' | 'nat' | 'eip' | 'lambda' | 's3' | 'cloudformation';

export type ResourceType =
  | 'ec2-instance'
  | 'rds-instance'
  | 'rds-cluster'
  | 'alb'
  | 'nlb'
  | 'clb'
  | 'ebs-volume'
  | 'nat-gateway'
  | 'elastic-ip'
  | 'lambda-function'
  | 's3-bucket'
  | 'cloudformation-stack';

export interface Resource {
  id: string;
  arn?: string;
  type: ResourceType;
  name: string;
  region: string;
  service: ServiceType;
  status: string;
  createdAt?: string;
  lastModified?: string;
  managed: boolean;
  stackId?: string;
  stackName?: string;
  metadata: Record<string, unknown>;
}

export interface CFStack {
  stackId: string;
  stackName: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  region: string;
  resources: CFStackResource[];
}

export interface CFStackResource {
  logicalId: string;
  physicalId: string;
  type: string;
  status: string;
}

export interface ServiceCost {
  service: string;
  amount: number;
  currency: string;
}

export interface CostSummary {
  period: { start: string; end: string };
  total: number;
  byService: ServiceCost[];
}

export interface ScanEvent {
  type: 'phase' | 'scanning' | 'resource_found' | 'stack_found' | 'service_complete' | 'scan_complete' | 'error';
  [key: string]: unknown;
}

export interface DeletionEvent {
  type: 'plan' | 'dry_run_complete' | 'deleting' | 'deleted' | 'delete_failed' | 'complete' | 'error';
  [key: string]: unknown;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  service?: string;
  region?: string;
}

export interface DeletionJob {
  jobId: string;
  profile: string;
  resourceIds: string[];
  dryRun: boolean;
  status: 'pending' | 'running' | 'complete' | 'error';
  events: DeletionEvent[];
}
