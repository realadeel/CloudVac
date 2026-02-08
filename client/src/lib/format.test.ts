import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  truncate,
  formatBytes,
  formatNumber,
  formatResourceType,
  formatEstimate,
} from './format.js';

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe('formatCurrency', () => {
  it('formats whole dollars', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('formats cents', () => {
    expect(formatCurrency(0.5)).toBe('$0.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats large amounts with commas', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(1.999)).toBe('$2.00');
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('formats a date string', () => {
    // Use ISO format with time to avoid timezone-shift issues
    const result = formatDate('2024-01-15T12:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('returns dash for undefined', () => {
    expect(formatDate()).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });
});

// ---------------------------------------------------------------------------
// formatRelativeDate
// ---------------------------------------------------------------------------
describe('formatRelativeDate', () => {
  it('returns dash for undefined', () => {
    expect(formatRelativeDate()).toBe('-');
    expect(formatRelativeDate(undefined)).toBe('-');
  });

  it('returns "Today" for current date', () => {
    expect(formatRelativeDate(new Date().toISOString())).toBe('Today');
  });

  it('returns "Yesterday" for 1 day ago', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(formatRelativeDate(d.toISOString())).toBe('Yesterday');
  });

  it('returns days ago for <30 days', () => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    expect(formatRelativeDate(d.toISOString())).toBe('15d ago');
  });

  it('returns months ago for <365 days', () => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    expect(formatRelativeDate(d.toISOString())).toBe('3mo ago');
  });

  it('returns years ago for >=365 days', () => {
    const d = new Date();
    d.setDate(d.getDate() - 400);
    expect(formatRelativeDate(d.toISOString())).toBe('1y ago');
  });
});

// ---------------------------------------------------------------------------
// truncate
// ---------------------------------------------------------------------------
describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('abc', 10)).toBe('abc');
  });

  it('truncates long strings with ellipsis', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd\u2026');
  });

  it('handles exact length', () => {
    expect(truncate('abcde', 5)).toBe('abcde');
  });

  it('handles length 1', () => {
    expect(truncate('ab', 1)).toBe('\u2026');
  });
});

// ---------------------------------------------------------------------------
// formatBytes
// ---------------------------------------------------------------------------
describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats KB', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('formats MB', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB');
  });

  it('formats GB', () => {
    expect(formatBytes(1073741824)).toBe('1.0 GB');
  });

  it('formats TB', () => {
    expect(formatBytes(1099511627776)).toBe('1.0 TB');
  });

  it('rounds large values', () => {
    expect(formatBytes(15 * 1024 * 1024)).toBe('15 MB');
  });

  it('shows one decimal for small values', () => {
    expect(formatBytes(5.5 * 1024)).toBe('5.5 KB');
  });
});

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------
describe('formatNumber', () => {
  it('formats with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats small numbers', () => {
    expect(formatNumber(42)).toBe('42');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// formatResourceType
// ---------------------------------------------------------------------------
describe('formatResourceType', () => {
  it('formats known types', () => {
    expect(formatResourceType('ec2-instance')).toBe('EC2 Instance');
    expect(formatResourceType('s3-bucket')).toBe('S3 Bucket');
    expect(formatResourceType('lambda-function')).toBe('Lambda Function');
    expect(formatResourceType('nat-gateway')).toBe('NAT Gateway');
    expect(formatResourceType('cloudformation-stack')).toBe('CF Stack');
    expect(formatResourceType('cloudwatch-log-group')).toBe('Log Group');
    expect(formatResourceType('cloudwatch-alarm')).toBe('Alarm');
  });

  it('returns raw type for unknown types', () => {
    expect(formatResourceType('unknown-thing')).toBe('unknown-thing');
  });

  it('covers all 24 resource types', () => {
    const allTypes = [
      'ec2-instance', 'rds-instance', 'rds-cluster', 'alb', 'nlb', 'clb',
      'ebs-volume', 'nat-gateway', 'elastic-ip', 'lambda-function', 's3-bucket',
      'dynamodb-table', 'vpc', 'subnet', 'security-group', 'internet-gateway',
      'route-table', 'cloudwatch-log-group', 'cloudwatch-alarm', 'sns-topic',
      'sqs-queue', 'apigateway-rest-api', 'apigateway-http-api', 'cloudformation-stack',
    ];
    for (const type of allTypes) {
      const result = formatResourceType(type);
      expect(result).not.toBe(type); // Should have a human-readable label
    }
  });
});

// ---------------------------------------------------------------------------
// formatEstimate
// ---------------------------------------------------------------------------
describe('formatEstimate', () => {
  it('returns em dash for null', () => {
    expect(formatEstimate(null)).toBe('\u2014');
  });

  it('returns $0 for zero', () => {
    expect(formatEstimate(0)).toBe('$0');
  });

  it('returns <$0.01 for tiny amounts', () => {
    expect(formatEstimate(0.001)).toBe('<$0.01');
    expect(formatEstimate(0.009)).toBe('<$0.01');
  });

  it('formats normal amounts', () => {
    expect(formatEstimate(32.85)).toBe('$32.85');
    expect(formatEstimate(1234.56)).toBe('$1,234.56');
  });

  it('formats $0.01 exactly', () => {
    expect(formatEstimate(0.01)).toBe('$0.01');
  });
});
