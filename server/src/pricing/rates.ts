// Static AWS on-demand pricing — us-east-1 baseline, hourly rates unless noted.
// Last updated: 2025-02. Prices from https://aws.amazon.com/ec2/pricing/on-demand/
//
// IMPORTANT: These are approximate estimates. Always consult the latest AWS pricing
// pages for exact rates. Update the values in this file for more accurate pricing.
// Rates rarely change for established instance types, but regional multipliers and
// newer instance families may drift over time.

export const HOURS_PER_MONTH = 730;

/**
 * Per-service regional price multipliers relative to us-east-1.
 * These are approximate — always consult the latest AWS pricing pages for exact rates.
 * Sources: AWS on-demand pricing pages, Feb 2025.
 */
export type PricingService = 'ec2' | 'ebs' | 'rds' | 'nat' | 'eip' | 'elb' | 'dynamodb' | 'cloudwatch' | 's3';

export const REGIONAL_MULTIPLIERS: Record<PricingService, Record<string, number>> = {
  ec2: {
    'us-east-1': 1.0, 'us-east-2': 1.0, 'us-west-1': 1.17, 'us-west-2': 1.0,
    'ca-central-1': 1.10, 'eu-west-1': 1.13, 'eu-west-2': 1.18, 'eu-west-3': 1.17,
    'eu-central-1': 1.13, 'eu-north-1': 1.04, 'ap-northeast-1': 1.31, 'ap-northeast-2': 1.27,
    'ap-northeast-3': 1.31, 'ap-southeast-1': 1.13, 'ap-southeast-2': 1.23, 'ap-south-1': 1.04,
    'sa-east-1': 1.62, 'ap-east-1': 1.27, 'me-south-1': 1.20, 'af-south-1': 1.29,
  },
  ebs: {
    'us-east-1': 1.0, 'us-east-2': 1.0, 'us-west-1': 1.13, 'us-west-2': 1.0,
    'ca-central-1': 1.10, 'eu-west-1': 1.10, 'eu-west-2': 1.13, 'eu-west-3': 1.13,
    'eu-central-1': 1.10, 'eu-north-1': 1.03, 'ap-northeast-1': 1.20, 'ap-northeast-2': 1.19,
    'ap-northeast-3': 1.20, 'ap-southeast-1': 1.13, 'ap-southeast-2': 1.20, 'ap-south-1': 1.03,
    'sa-east-1': 1.50, 'ap-east-1': 1.19, 'me-south-1': 1.16, 'af-south-1': 1.21,
  },
  rds: {
    'us-east-1': 1.0, 'us-east-2': 1.0, 'us-west-1': 1.15, 'us-west-2': 1.0,
    'ca-central-1': 1.10, 'eu-west-1': 1.12, 'eu-west-2': 1.16, 'eu-west-3': 1.15,
    'eu-central-1': 1.12, 'eu-north-1': 1.04, 'ap-northeast-1': 1.28, 'ap-northeast-2': 1.24,
    'ap-northeast-3': 1.28, 'ap-southeast-1': 1.12, 'ap-southeast-2': 1.22, 'ap-south-1': 1.04,
    'sa-east-1': 1.56, 'ap-east-1': 1.24, 'me-south-1': 1.18, 'af-south-1': 1.26,
  },
  nat: {
    'us-east-1': 1.0, 'us-east-2': 1.0, 'us-west-1': 1.11, 'us-west-2': 1.0,
    'ca-central-1': 1.0, 'eu-west-1': 1.0, 'eu-west-2': 1.11, 'eu-west-3': 1.11,
    'eu-central-1': 1.0, 'eu-north-1': 1.0, 'ap-northeast-1': 1.22, 'ap-northeast-2': 1.13,
    'ap-northeast-3': 1.22, 'ap-southeast-1': 1.0, 'ap-southeast-2': 1.11, 'ap-south-1': 1.0,
    'sa-east-1': 1.33, 'ap-east-1': 1.13, 'me-south-1': 1.11, 'af-south-1': 1.22,
  },
  eip: {
    'us-east-1': 1.0, 'us-east-2': 1.0, 'us-west-1': 1.0, 'us-west-2': 1.0,
    'ca-central-1': 1.0, 'eu-west-1': 1.0, 'eu-west-2': 1.0, 'eu-west-3': 1.0,
    'eu-central-1': 1.0, 'eu-north-1': 1.0, 'ap-northeast-1': 1.0, 'ap-northeast-2': 1.0,
    'ap-northeast-3': 1.0, 'ap-southeast-1': 1.0, 'ap-southeast-2': 1.0, 'ap-south-1': 1.0,
    'sa-east-1': 1.0, 'ap-east-1': 1.0, 'me-south-1': 1.0, 'af-south-1': 1.0,
  },
  elb: {
    'us-east-1': 1.0, 'us-east-2': 1.0, 'us-west-1': 1.11, 'us-west-2': 1.0,
    'ca-central-1': 1.0, 'eu-west-1': 1.0, 'eu-west-2': 1.11, 'eu-west-3': 1.11,
    'eu-central-1': 1.0, 'eu-north-1': 1.0, 'ap-northeast-1': 1.22, 'ap-northeast-2': 1.11,
    'ap-northeast-3': 1.22, 'ap-southeast-1': 1.0, 'ap-southeast-2': 1.11, 'ap-south-1': 1.0,
    'sa-east-1': 1.33, 'ap-east-1': 1.11, 'me-south-1': 1.11, 'af-south-1': 1.22,
  },
  dynamodb: {
    'us-east-1': 1.0, 'us-east-2': 1.0, 'us-west-1': 1.15, 'us-west-2': 1.0,
    'ca-central-1': 1.15, 'eu-west-1': 1.15, 'eu-west-2': 1.21, 'eu-west-3': 1.17,
    'eu-central-1': 1.15, 'eu-north-1': 1.08, 'ap-northeast-1': 1.36, 'ap-northeast-2': 1.30,
    'ap-northeast-3': 1.36, 'ap-southeast-1': 1.15, 'ap-southeast-2': 1.21, 'ap-south-1': 1.08,
    'sa-east-1': 1.63, 'ap-east-1': 1.30, 'me-south-1': 1.25, 'af-south-1': 1.30,
  },
  cloudwatch: {
    'us-east-1': 1.0, 'us-east-2': 1.0, 'us-west-1': 1.0, 'us-west-2': 1.0,
    'ca-central-1': 1.0, 'eu-west-1': 1.0, 'eu-west-2': 1.0, 'eu-west-3': 1.0,
    'eu-central-1': 1.0, 'eu-north-1': 1.0, 'ap-northeast-1': 1.0, 'ap-northeast-2': 1.0,
    'ap-northeast-3': 1.0, 'ap-southeast-1': 1.0, 'ap-southeast-2': 1.0, 'ap-south-1': 1.0,
    'sa-east-1': 1.0, 'ap-east-1': 1.0, 'me-south-1': 1.0, 'af-south-1': 1.0,
  },
  s3: {
    'us-east-1': 1.0, 'us-east-2': 1.0, 'us-west-1': 1.09, 'us-west-2': 1.0,
    'ca-central-1': 1.04, 'eu-west-1': 1.04, 'eu-west-2': 1.09, 'eu-west-3': 1.09,
    'eu-central-1': 1.04, 'eu-north-1': 1.04, 'ap-northeast-1': 1.09, 'ap-northeast-2': 1.09,
    'ap-northeast-3': 1.09, 'ap-southeast-1': 1.04, 'ap-southeast-2': 1.09, 'ap-south-1': 1.04,
    'sa-east-1': 1.39, 'ap-east-1': 1.09, 'me-south-1': 1.09, 'af-south-1': 1.17,
  },
};

// ---------------------------------------------------------------------------
// EC2 — on-demand Linux, per-hour
// ---------------------------------------------------------------------------
export const EC2_HOURLY: Record<string, number> = {
  // T2
  't2.nano': 0.0058,
  't2.micro': 0.0116,
  't2.small': 0.023,
  't2.medium': 0.0464,
  't2.large': 0.0928,
  't2.xlarge': 0.1856,
  't2.2xlarge': 0.3712,

  // T3
  't3.nano': 0.0052,
  't3.micro': 0.0104,
  't3.small': 0.0208,
  't3.medium': 0.0416,
  't3.large': 0.0832,
  't3.xlarge': 0.1664,
  't3.2xlarge': 0.3328,

  // T3a
  't3a.nano': 0.0047,
  't3a.micro': 0.0094,
  't3a.small': 0.0188,
  't3a.medium': 0.0376,
  't3a.large': 0.0752,
  't3a.xlarge': 0.1504,
  't3a.2xlarge': 0.3008,

  // M5
  'm5.large': 0.096,
  'm5.xlarge': 0.192,
  'm5.2xlarge': 0.384,
  'm5.4xlarge': 0.768,
  'm5.8xlarge': 1.536,
  'm5.12xlarge': 2.304,
  'm5.16xlarge': 3.072,
  'm5.24xlarge': 4.608,

  // M5a
  'm5a.large': 0.086,
  'm5a.xlarge': 0.172,
  'm5a.2xlarge': 0.344,
  'm5a.4xlarge': 0.688,

  // M6i
  'm6i.large': 0.096,
  'm6i.xlarge': 0.192,
  'm6i.2xlarge': 0.384,
  'm6i.4xlarge': 0.768,
  'm6i.8xlarge': 1.536,

  // M6a
  'm6a.large': 0.0864,
  'm6a.xlarge': 0.1728,
  'm6a.2xlarge': 0.3456,
  'm6a.4xlarge': 0.6912,

  // M7i
  'm7i.large': 0.1008,
  'm7i.xlarge': 0.2016,
  'm7i.2xlarge': 0.4032,
  'm7i.4xlarge': 0.8064,

  // C5
  'c5.large': 0.085,
  'c5.xlarge': 0.17,
  'c5.2xlarge': 0.34,
  'c5.4xlarge': 0.68,
  'c5.9xlarge': 1.53,
  'c5.18xlarge': 3.06,

  // C6i
  'c6i.large': 0.085,
  'c6i.xlarge': 0.17,
  'c6i.2xlarge': 0.34,
  'c6i.4xlarge': 0.68,

  // C7i
  'c7i.large': 0.0892,
  'c7i.xlarge': 0.1785,
  'c7i.2xlarge': 0.357,

  // R5
  'r5.large': 0.126,
  'r5.xlarge': 0.252,
  'r5.2xlarge': 0.504,
  'r5.4xlarge': 1.008,
  'r5.8xlarge': 2.016,
  'r5.12xlarge': 3.024,

  // R6i
  'r6i.large': 0.126,
  'r6i.xlarge': 0.252,
  'r6i.2xlarge': 0.504,
  'r6i.4xlarge': 1.008,

  // R7i
  'r7i.large': 0.1323,
  'r7i.xlarge': 0.2646,
  'r7i.2xlarge': 0.5292,

  // I3 (storage optimized)
  'i3.large': 0.156,
  'i3.xlarge': 0.312,
  'i3.2xlarge': 0.624,

  // Graviton (ARM) — T4g, M6g, M7g, C6g, C7g, R6g, R7g
  't4g.nano': 0.0042,
  't4g.micro': 0.0084,
  't4g.small': 0.0168,
  't4g.medium': 0.0336,
  't4g.large': 0.0672,
  't4g.xlarge': 0.1344,
  't4g.2xlarge': 0.2688,

  'm6g.medium': 0.0385,
  'm6g.large': 0.077,
  'm6g.xlarge': 0.154,
  'm6g.2xlarge': 0.308,
  'm6g.4xlarge': 0.616,

  'm7g.medium': 0.0408,
  'm7g.large': 0.0816,
  'm7g.xlarge': 0.1632,
  'm7g.2xlarge': 0.3264,

  'c6g.medium': 0.034,
  'c6g.large': 0.068,
  'c6g.xlarge': 0.136,
  'c6g.2xlarge': 0.272,

  'c7g.medium': 0.0361,
  'c7g.large': 0.0725,
  'c7g.xlarge': 0.145,
  'c7g.2xlarge': 0.29,

  'r6g.medium': 0.0503,
  'r6g.large': 0.1008,
  'r6g.xlarge': 0.2016,
  'r6g.2xlarge': 0.4032,

  'r7g.medium': 0.0534,
  'r7g.large': 0.1068,
  'r7g.xlarge': 0.2136,
  'r7g.2xlarge': 0.4272,
};

// ---------------------------------------------------------------------------
// EBS — per GB-month
// ---------------------------------------------------------------------------
export const EBS_PER_GB: Record<string, number> = {
  gp2: 0.10,
  gp3: 0.08,
  io1: 0.125,
  io2: 0.125,
  st1: 0.045,
  sc1: 0.015,
  standard: 0.05,
};

/** Provisioned IOPS cost per IOPS-month */
export const EBS_IOPS: Record<string, number> = {
  io1: 0.065,
  io2: 0.065,
  gp3: 0.005, // only charged above 3000 baseline
};

/** gp3 throughput cost per MB/s-month (above 125 MB/s baseline) */
export const EBS_THROUGHPUT_GP3 = 0.04;

/** gp3 baseline thresholds */
export const GP3_BASELINE_IOPS = 3000;
export const GP3_BASELINE_THROUGHPUT = 125; // MB/s

// ---------------------------------------------------------------------------
// RDS — on-demand, single-AZ, per-hour
// ---------------------------------------------------------------------------
export const RDS_HOURLY: Record<string, number> = {
  // T3
  'db.t3.micro': 0.017,
  'db.t3.small': 0.034,
  'db.t3.medium': 0.068,
  'db.t3.large': 0.136,
  'db.t3.xlarge': 0.272,
  'db.t3.2xlarge': 0.544,

  // T4g
  'db.t4g.micro': 0.016,
  'db.t4g.small': 0.032,
  'db.t4g.medium': 0.065,
  'db.t4g.large': 0.129,

  // M5
  'db.m5.large': 0.171,
  'db.m5.xlarge': 0.342,
  'db.m5.2xlarge': 0.684,
  'db.m5.4xlarge': 1.368,

  // M6i
  'db.m6i.large': 0.171,
  'db.m6i.xlarge': 0.342,
  'db.m6i.2xlarge': 0.684,

  // M6g
  'db.m6g.large': 0.154,
  'db.m6g.xlarge': 0.308,
  'db.m6g.2xlarge': 0.615,

  // R5
  'db.r5.large': 0.24,
  'db.r5.xlarge': 0.48,
  'db.r5.2xlarge': 0.96,
  'db.r5.4xlarge': 1.92,

  // R6g
  'db.r6g.large': 0.218,
  'db.r6g.xlarge': 0.435,
  'db.r6g.2xlarge': 0.87,

  // R6i
  'db.r6i.large': 0.24,
  'db.r6i.xlarge': 0.48,
  'db.r6i.2xlarge': 0.96,
};

/** RDS storage per GB-month */
export const RDS_STORAGE_PER_GB: Record<string, number> = {
  gp2: 0.115,
  gp3: 0.08,
  io1: 0.125,
  io2: 0.125,
  standard: 0.10,
  magnetic: 0.10,
};

// ---------------------------------------------------------------------------
// NAT Gateway — per hour (no data processing estimate, we lack transfer data)
// ---------------------------------------------------------------------------
export const NAT_HOURLY = 0.045;

// ---------------------------------------------------------------------------
// Elastic IP — per hour when unassociated
// ---------------------------------------------------------------------------
export const EIP_UNUSED_HOURLY = 0.005;

// ---------------------------------------------------------------------------
// ELB — per hour (base cost only, no LCU/NLCU data)
// ---------------------------------------------------------------------------
export const ELB_HOURLY: Record<string, number> = {
  alb: 0.0225,
  nlb: 0.0225,
  clb: 0.025,
};

// ---------------------------------------------------------------------------
// DynamoDB (provisioned mode) — per unit per hour
// ---------------------------------------------------------------------------
export const DYNAMODB_RCU_HOURLY = 0.00013;
export const DYNAMODB_WCU_HOURLY = 0.00065;
export const DYNAMODB_STORAGE_PER_GB = 0.25;

// ---------------------------------------------------------------------------
// CloudWatch
// ---------------------------------------------------------------------------
export const CW_LOG_STORAGE_PER_GB = 0.03; // per GB-month stored
export const CW_ALARM_STANDARD = 0.10;      // per alarm per month (standard resolution)

// ---------------------------------------------------------------------------
// S3 — Standard storage per GB-month
// ---------------------------------------------------------------------------
export const S3_STORAGE_PER_GB = 0.023;
