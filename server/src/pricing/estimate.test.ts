import { describe, it, expect } from 'vitest';
import { estimateMonthlyCost } from './estimate.js';
import {
  HOURS_PER_MONTH,
  REGIONAL_MULTIPLIERS,
  EC2_HOURLY,
  EBS_PER_GB,
  NAT_HOURLY,
  EIP_UNUSED_HOURLY,
  ELB_HOURLY,
  CW_ALARM_STANDARD,
  CW_LOG_STORAGE_PER_GB,
  S3_STORAGE_PER_GB,
  RDS_HOURLY,
  RDS_STORAGE_PER_GB,
  DYNAMODB_RCU_HOURLY,
  DYNAMODB_WCU_HOURLY,
  DYNAMODB_STORAGE_PER_GB,
} from './rates.js';
import type { Resource } from '../../../shared/types.js';

function makeResource(overrides: Partial<Resource> & { type: Resource['type'] }): Resource {
  const { type, ...rest } = overrides;
  return {
    id: 'test-id',
    type,
    name: 'test-resource',
    region: 'us-east-1',
    service: 'ec2' as any,
    status: 'active',
    managed: false,
    metadata: {},
    ...rest,
  };
}

// ---------------------------------------------------------------------------
// EC2
// ---------------------------------------------------------------------------
describe('EC2 instances', () => {
  it('estimates t3.micro correctly', () => {
    const r = makeResource({
      type: 'ec2-instance',
      metadata: { instanceType: 't3.micro' },
    });
    const cost = estimateMonthlyCost(r);
    expect(cost).toBe(+(EC2_HOURLY['t3.micro'] * HOURS_PER_MONTH).toFixed(2));
  });

  it('estimates m5.large correctly', () => {
    const r = makeResource({
      type: 'ec2-instance',
      metadata: { instanceType: 'm5.large' },
    });
    const cost = estimateMonthlyCost(r);
    expect(cost).toBe(+(EC2_HOURLY['m5.large'] * HOURS_PER_MONTH).toFixed(2));
  });

  it('applies regional multiplier for us-west-1', () => {
    const r = makeResource({
      type: 'ec2-instance',
      region: 'us-west-1',
      metadata: { instanceType: 't3.micro' },
    });
    const cost = estimateMonthlyCost(r);
    const mul = REGIONAL_MULTIPLIERS.ec2['us-west-1'];
    expect(cost).toBe(+(EC2_HOURLY['t3.micro'] * HOURS_PER_MONTH * mul).toFixed(2));
  });

  it('returns null for unknown instance type', () => {
    const r = makeResource({
      type: 'ec2-instance',
      metadata: { instanceType: 'x99.superlarge' },
    });
    expect(estimateMonthlyCost(r)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// EBS
// ---------------------------------------------------------------------------
describe('EBS volumes', () => {
  it('estimates gp2 volume by size', () => {
    const r = makeResource({
      type: 'ebs-volume',
      metadata: { volumeType: 'gp2', size: 100 },
    });
    const cost = estimateMonthlyCost(r);
    expect(cost).toBe(+(EBS_PER_GB.gp2 * 100).toFixed(2));
  });

  it('estimates gp3 with baseline IOPS (no extra charge)', () => {
    const r = makeResource({
      type: 'ebs-volume',
      metadata: { volumeType: 'gp3', size: 50, iops: 3000, throughput: 125 },
    });
    const cost = estimateMonthlyCost(r);
    expect(cost).toBe(+(EBS_PER_GB.gp3 * 50).toFixed(2));
  });

  it('charges extra for gp3 IOPS above baseline', () => {
    const r = makeResource({
      type: 'ebs-volume',
      metadata: { volumeType: 'gp3', size: 50, iops: 5000, throughput: 125 },
    });
    const cost = estimateMonthlyCost(r)!;
    const baseCost = EBS_PER_GB.gp3 * 50;
    const iopsCost = (5000 - 3000) * 0.005;
    expect(cost).toBe(+(baseCost + iopsCost).toFixed(2));
  });

  it('charges extra for gp3 throughput above baseline', () => {
    const r = makeResource({
      type: 'ebs-volume',
      metadata: { volumeType: 'gp3', size: 50, iops: 3000, throughput: 250 },
    });
    const cost = estimateMonthlyCost(r)!;
    const baseCost = EBS_PER_GB.gp3 * 50;
    const tpCost = (250 - 125) * 0.04;
    expect(cost).toBe(+(baseCost + tpCost).toFixed(2));
  });

  it('estimates io1 with provisioned IOPS', () => {
    const r = makeResource({
      type: 'ebs-volume',
      metadata: { volumeType: 'io1', size: 200, iops: 1000 },
    });
    const cost = estimateMonthlyCost(r)!;
    const expected = EBS_PER_GB.io1 * 200 + 1000 * 0.065;
    expect(cost).toBe(+expected.toFixed(2));
  });

  it('defaults to gp2 when volumeType missing', () => {
    const r = makeResource({
      type: 'ebs-volume',
      metadata: { size: 20 },
    });
    const cost = estimateMonthlyCost(r);
    expect(cost).toBe(+(EBS_PER_GB.gp2 * 20).toFixed(2));
  });

  it('returns null for unknown volume type', () => {
    const r = makeResource({
      type: 'ebs-volume',
      metadata: { volumeType: 'exotic-type', size: 100 },
    });
    expect(estimateMonthlyCost(r)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// RDS
// ---------------------------------------------------------------------------
describe('RDS instances', () => {
  it('estimates single-AZ db.t3.micro', () => {
    const r = makeResource({
      type: 'rds-instance',
      metadata: { instanceClass: 'db.t3.micro', allocatedStorage: 20, storageType: 'gp2' },
    });
    const cost = estimateMonthlyCost(r)!;
    const expected = RDS_HOURLY['db.t3.micro'] * HOURS_PER_MONTH + RDS_STORAGE_PER_GB.gp2 * 20;
    expect(cost).toBe(+expected.toFixed(2));
  });

  it('doubles compute cost for multi-AZ', () => {
    const r = makeResource({
      type: 'rds-instance',
      metadata: { instanceClass: 'db.t3.micro', allocatedStorage: 20, storageType: 'gp2', multiAZ: true },
    });
    const cost = estimateMonthlyCost(r)!;
    const expected = RDS_HOURLY['db.t3.micro'] * HOURS_PER_MONTH * 2 + RDS_STORAGE_PER_GB.gp2 * 20;
    expect(cost).toBe(+expected.toFixed(2));
  });

  it('returns null for unknown instance class', () => {
    const r = makeResource({
      type: 'rds-instance',
      metadata: { instanceClass: 'db.z99.mega' },
    });
    expect(estimateMonthlyCost(r)).toBeNull();
  });

  it('returns null for RDS clusters', () => {
    const r = makeResource({ type: 'rds-cluster' });
    expect(estimateMonthlyCost(r)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// NAT Gateway
// ---------------------------------------------------------------------------
describe('NAT Gateway', () => {
  it('estimates correctly', () => {
    const r = makeResource({ type: 'nat-gateway' });
    expect(estimateMonthlyCost(r)).toBe(+(NAT_HOURLY * HOURS_PER_MONTH).toFixed(2));
  });

  it('applies regional multiplier', () => {
    const r = makeResource({ type: 'nat-gateway', region: 'us-west-1' });
    const mul = REGIONAL_MULTIPLIERS.nat['us-west-1'];
    expect(estimateMonthlyCost(r)).toBe(+(NAT_HOURLY * HOURS_PER_MONTH * mul).toFixed(2));
  });
});

// ---------------------------------------------------------------------------
// Elastic IP
// ---------------------------------------------------------------------------
describe('Elastic IP', () => {
  it('returns 0 when associated', () => {
    const r = makeResource({
      type: 'elastic-ip',
      metadata: { associated: true },
    });
    expect(estimateMonthlyCost(r)).toBe(0);
  });

  it('charges when unassociated', () => {
    const r = makeResource({
      type: 'elastic-ip',
      metadata: { associated: false },
    });
    expect(estimateMonthlyCost(r)).toBe(+(EIP_UNUSED_HOURLY * HOURS_PER_MONTH).toFixed(2));
  });
});

// ---------------------------------------------------------------------------
// ELB
// ---------------------------------------------------------------------------
describe('Load Balancers', () => {
  it('estimates ALB', () => {
    const r = makeResource({ type: 'alb' });
    expect(estimateMonthlyCost(r)).toBe(+(ELB_HOURLY.alb * HOURS_PER_MONTH).toFixed(2));
  });

  it('estimates NLB', () => {
    const r = makeResource({ type: 'nlb' });
    expect(estimateMonthlyCost(r)).toBe(+(ELB_HOURLY.alb * HOURS_PER_MONTH).toFixed(2));
  });

  it('estimates CLB', () => {
    const r = makeResource({ type: 'clb' });
    expect(estimateMonthlyCost(r)).toBe(+(ELB_HOURLY.clb * HOURS_PER_MONTH).toFixed(2));
  });
});

// ---------------------------------------------------------------------------
// DynamoDB
// ---------------------------------------------------------------------------
describe('DynamoDB', () => {
  it('estimates provisioned mode table', () => {
    const r = makeResource({
      type: 'dynamodb-table',
      metadata: { billingMode: 'PROVISIONED', readCapacity: 10, writeCapacity: 5, sizeBytes: 1e9 },
    });
    const cost = estimateMonthlyCost(r)!;
    const expected =
      10 * DYNAMODB_RCU_HOURLY * HOURS_PER_MONTH +
      5 * DYNAMODB_WCU_HOURLY * HOURS_PER_MONTH +
      1 * DYNAMODB_STORAGE_PER_GB;
    expect(cost).toBe(+expected.toFixed(2));
  });

  it('returns null for on-demand (PAY_PER_REQUEST)', () => {
    const r = makeResource({
      type: 'dynamodb-table',
      metadata: { billingMode: 'PAY_PER_REQUEST' },
    });
    expect(estimateMonthlyCost(r)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CloudWatch
// ---------------------------------------------------------------------------
describe('CloudWatch', () => {
  it('estimates log group storage cost', () => {
    const r = makeResource({
      type: 'cloudwatch-log-group',
      metadata: { storedBytes: 5e9 },
    });
    const cost = estimateMonthlyCost(r)!;
    expect(cost).toBe(+(5 * CW_LOG_STORAGE_PER_GB).toFixed(2));
  });

  it('returns 0 for empty log group', () => {
    const r = makeResource({
      type: 'cloudwatch-log-group',
      metadata: { storedBytes: 0 },
    });
    expect(estimateMonthlyCost(r)).toBe(0);
  });

  it('estimates alarm at standard rate', () => {
    const r = makeResource({ type: 'cloudwatch-alarm' });
    expect(estimateMonthlyCost(r)).toBe(+(CW_ALARM_STANDARD).toFixed(2));
  });
});

// ---------------------------------------------------------------------------
// S3
// ---------------------------------------------------------------------------
describe('S3 buckets', () => {
  it('estimates based on bucket stats', () => {
    const r = makeResource({ type: 's3-bucket' });
    const cost = estimateMonthlyCost(r, { totalSize: 100e9 });
    expect(cost).toBe(+(100 * S3_STORAGE_PER_GB).toFixed(2));
  });

  it('returns null when no bucket stats', () => {
    const r = makeResource({ type: 's3-bucket' });
    expect(estimateMonthlyCost(r)).toBeNull();
    expect(estimateMonthlyCost(r, null)).toBeNull();
  });

  it('returns 0 for empty bucket', () => {
    const r = makeResource({ type: 's3-bucket' });
    expect(estimateMonthlyCost(r, { totalSize: 0 })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Free / idle resources
// ---------------------------------------------------------------------------
describe('Free and idle resources', () => {
  const freeTypes: Resource['type'][] = [
    'lambda-function', 'sns-topic', 'sqs-queue',
    'apigateway-rest-api', 'apigateway-http-api',
    'vpc', 'subnet', 'security-group', 'internet-gateway', 'route-table',
  ];

  for (const type of freeTypes) {
    it(`returns 0 for ${type}`, () => {
      const r = makeResource({ type });
      expect(estimateMonthlyCost(r)).toBe(0);
    });
  }
});

// ---------------------------------------------------------------------------
// CloudFormation stacks
// ---------------------------------------------------------------------------
describe('CloudFormation stacks', () => {
  it('returns null (cost is in child resources)', () => {
    const r = makeResource({ type: 'cloudformation-stack' });
    expect(estimateMonthlyCost(r)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Regional multiplier
// ---------------------------------------------------------------------------
describe('Regional multipliers', () => {
  it('us-east-1 multiplier is 1.0 for all services', () => {
    const r = makeResource({ type: 'nat-gateway', region: 'us-east-1' });
    const cost = estimateMonthlyCost(r)!;
    expect(cost).toBe(+(NAT_HOURLY * HOURS_PER_MONTH * 1.0).toFixed(2));
  });

  it('us-west-1 uses per-service multiplier', () => {
    const r = makeResource({ type: 'nat-gateway', region: 'us-west-1' });
    const cost = estimateMonthlyCost(r)!;
    const mul = REGIONAL_MULTIPLIERS.nat['us-west-1'];
    expect(cost).toBe(+(NAT_HOURLY * HOURS_PER_MONTH * mul).toFixed(2));
  });

  it('different services get different multipliers in the same region', () => {
    const ec2 = makeResource({
      type: 'ec2-instance',
      region: 'ap-northeast-1',
      metadata: { instanceType: 't3.micro' },
    });
    const nat = makeResource({ type: 'nat-gateway', region: 'ap-northeast-1' });

    const ec2Cost = estimateMonthlyCost(ec2)!;
    const natCost = estimateMonthlyCost(nat)!;

    const ec2Mul = REGIONAL_MULTIPLIERS.ec2['ap-northeast-1'];
    const natMul = REGIONAL_MULTIPLIERS.nat['ap-northeast-1'];

    expect(ec2Cost).toBe(+(EC2_HOURLY['t3.micro'] * HOURS_PER_MONTH * ec2Mul).toFixed(2));
    expect(natCost).toBe(+(NAT_HOURLY * HOURS_PER_MONTH * natMul).toFixed(2));
    expect(ec2Mul).not.toBe(natMul);
  });

  it('unknown region defaults to 1.0', () => {
    const r = makeResource({ type: 'nat-gateway', region: 'xx-unknown-1' });
    const cost = estimateMonthlyCost(r)!;
    expect(cost).toBe(+(NAT_HOURLY * HOURS_PER_MONTH * 1.0).toFixed(2));
  });
});
