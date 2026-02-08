import type { Resource } from '../../../shared/types.js';
import {
  HOURS_PER_MONTH,
  REGIONAL_MULTIPLIERS,
  EC2_HOURLY,
  EBS_PER_GB,
  EBS_IOPS,
  EBS_THROUGHPUT_GP3,
  GP3_BASELINE_IOPS,
  GP3_BASELINE_THROUGHPUT,
  RDS_HOURLY,
  RDS_STORAGE_PER_GB,
  NAT_HOURLY,
  EIP_UNUSED_HOURLY,
  ELB_HOURLY,
  DYNAMODB_RCU_HOURLY,
  DYNAMODB_WCU_HOURLY,
  DYNAMODB_STORAGE_PER_GB,
  CW_LOG_STORAGE_PER_GB,
  CW_ALARM_STANDARD,
  S3_STORAGE_PER_GB,
} from './rates.js';

function multiplier(region: string): number {
  return REGIONAL_MULTIPLIERS[region] ?? 1.0;
}

/**
 * Estimate the monthly cost of a resource based on its type and metadata.
 * Returns null when we can't compute a meaningful estimate (e.g., unknown instance type,
 * on-demand DynamoDB, CF stacks where cost is in child resources).
 * Returns 0 for resources that are genuinely free or $0 when idle.
 */
export function estimateMonthlyCost(
  resource: Resource,
  bucketStats?: { totalSize: number } | null,
): number | null {
  const m = resource.metadata;
  const mul = multiplier(resource.region);

  switch (resource.type) {
    // -----------------------------------------------------------------------
    case 'ec2-instance': {
      const rate = EC2_HOURLY[m.instanceType as string];
      if (rate == null) return null;
      return +(rate * HOURS_PER_MONTH * mul).toFixed(2);
    }

    // -----------------------------------------------------------------------
    case 'ebs-volume': {
      const volType = (m.volumeType as string) ?? 'gp2';
      const sizeGB = (m.size as number) ?? 0;
      const perGB = EBS_PER_GB[volType];
      if (perGB == null) return null;

      let cost = perGB * sizeGB;

      // Provisioned IOPS charges
      const iops = (m.iops as number) ?? 0;
      if (volType === 'gp3' && iops > GP3_BASELINE_IOPS) {
        cost += (iops - GP3_BASELINE_IOPS) * (EBS_IOPS.gp3 ?? 0);
      } else if ((volType === 'io1' || volType === 'io2') && iops > 0) {
        cost += iops * (EBS_IOPS[volType] ?? 0);
      }

      // gp3 throughput charges above baseline
      if (volType === 'gp3') {
        const throughput = (m.throughput as number) ?? 0;
        if (throughput > GP3_BASELINE_THROUGHPUT) {
          cost += (throughput - GP3_BASELINE_THROUGHPUT) * EBS_THROUGHPUT_GP3;
        }
      }

      return +(cost * mul).toFixed(2);
    }

    // -----------------------------------------------------------------------
    case 'rds-instance': {
      const instanceClass = m.instanceClass as string;
      const rate = RDS_HOURLY[instanceClass];
      if (rate == null) return null;

      const multiAZ = (m.multiAZ as boolean) ?? false;
      let cost = rate * HOURS_PER_MONTH * (multiAZ ? 2 : 1);

      // Storage cost
      const storageGB = (m.allocatedStorage as number) ?? 0;
      const storageType = (m.storageType as string) ?? 'gp2';
      const storageCost = RDS_STORAGE_PER_GB[storageType] ?? RDS_STORAGE_PER_GB.gp2;
      cost += storageCost * storageGB;

      return +(cost * mul).toFixed(2);
    }

    // -----------------------------------------------------------------------
    case 'rds-cluster':
      // We don't have per-member instance class data
      return null;

    // -----------------------------------------------------------------------
    case 'nat-gateway':
      return +(NAT_HOURLY * HOURS_PER_MONTH * mul).toFixed(2);

    // -----------------------------------------------------------------------
    case 'elastic-ip': {
      const associated = m.associated as boolean;
      if (associated) return 0;
      return +(EIP_UNUSED_HOURLY * HOURS_PER_MONTH * mul).toFixed(2);
    }

    // -----------------------------------------------------------------------
    case 'alb':
    case 'nlb': {
      const rate = ELB_HOURLY.alb;
      return +(rate * HOURS_PER_MONTH * mul).toFixed(2);
    }

    case 'clb':
      return +(ELB_HOURLY.clb * HOURS_PER_MONTH * mul).toFixed(2);

    // -----------------------------------------------------------------------
    case 'dynamodb-table': {
      const billing = m.billingMode as string;
      if (billing !== 'PROVISIONED') return null; // on-demand = need request counts

      const rcu = (m.readCapacity as number) ?? 0;
      const wcu = (m.writeCapacity as number) ?? 0;
      const sizeBytes = (m.sizeBytes as number) ?? 0;
      const sizeGB = sizeBytes / 1e9;

      const cost =
        rcu * DYNAMODB_RCU_HOURLY * HOURS_PER_MONTH +
        wcu * DYNAMODB_WCU_HOURLY * HOURS_PER_MONTH +
        sizeGB * DYNAMODB_STORAGE_PER_GB;

      return +(cost * mul).toFixed(2);
    }

    // -----------------------------------------------------------------------
    case 'cloudwatch-log-group': {
      const storedBytes = (m.storedBytes as number) ?? 0;
      const storedGB = storedBytes / 1e9;
      return +(storedGB * CW_LOG_STORAGE_PER_GB * mul).toFixed(2);
    }

    // -----------------------------------------------------------------------
    case 'cloudwatch-alarm':
      return +(CW_ALARM_STANDARD * mul).toFixed(2);

    // -----------------------------------------------------------------------
    case 's3-bucket': {
      if (!bucketStats) return null;
      const sizeGB = bucketStats.totalSize / 1e9;
      return +(sizeGB * S3_STORAGE_PER_GB * mul).toFixed(2);
    }

    // -----------------------------------------------------------------------
    // Free or $0 when idle (no usage data to estimate runtime costs)
    case 'lambda-function':
    case 'sns-topic':
    case 'sqs-queue':
    case 'apigateway-rest-api':
    case 'apigateway-http-api':
    case 'vpc':
    case 'subnet':
    case 'security-group':
    case 'internet-gateway':
    case 'route-table':
      return 0;

    // -----------------------------------------------------------------------
    // CF stacks — cost is in child resources, estimating here would double-count
    case 'cloudformation-stack':
      return null;

    default:
      return null;
  }
}
