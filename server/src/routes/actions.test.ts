import { describe, it, expect } from 'vitest';
import { findOrphanedLogGroups } from './resource-utils.js';
import type { Resource } from '../../../shared/types.js';

function makeResource(overrides: Partial<Resource> & { type: Resource['type'] }): Resource {
  const { type, ...rest } = overrides;
  return {
    id: 'test-id',
    type,
    name: 'test-resource',
    region: 'us-east-1',
    service: 'cloudwatch' as any,
    status: 'active',
    managed: false,
    metadata: {},
    ...rest,
  };
}

function logGroup(name: string, extra?: Partial<Resource>) {
  return makeResource({
    id: `arn:logs:us-east-1:123:log-group:${name}`,
    type: 'cloudwatch-log-group',
    name,
    service: 'cloudwatch' as any,
    metadata: { storedBytes: 1024, retentionDays: 30 },
    ...extra,
  });
}

function lambdaFn(name: string) {
  return makeResource({
    id: `arn:lambda:us-east-1:123:function:${name}`,
    type: 'lambda-function',
    name,
    service: 'lambda' as any,
  });
}

function rdsInstance(name: string) {
  return makeResource({
    id: name,
    type: 'rds-instance',
    name,
    service: 'rds' as any,
  });
}

function rdsCluster(name: string) {
  return makeResource({
    id: name,
    type: 'rds-cluster',
    name,
    service: 'rds' as any,
  });
}

function apiGateway(id: string, name: string) {
  return makeResource({
    id,
    type: 'apigateway-rest-api',
    name,
    service: 'apigateway' as any,
    metadata: { id },
  });
}

describe('findOrphanedLogGroups', () => {
  it('returns empty when no log groups exist', () => {
    const resources = [lambdaFn('my-fn')];
    expect(findOrphanedLogGroups(resources)).toEqual([]);
  });

  it('returns empty when no resources exist (non-aws-prefixed log groups are ignored)', () => {
    const resources = [logGroup('my-custom-log-group')];
    expect(findOrphanedLogGroups(resources)).toEqual([]);
  });

  it('detects orphaned Lambda log groups', () => {
    const resources = [
      logGroup('/aws/lambda/my-fn'),
      logGroup('/aws/lambda/deleted-fn'),
      lambdaFn('my-fn'),
    ];
    const orphans = findOrphanedLogGroups(resources);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].expectedResource).toBe('deleted-fn');
    expect(orphans[0].service).toBe('Lambda');
  });

  it('does not flag Lambda log groups with existing functions', () => {
    const resources = [
      logGroup('/aws/lambda/fn-a'),
      logGroup('/aws/lambda/fn-b'),
      lambdaFn('fn-a'),
      lambdaFn('fn-b'),
    ];
    expect(findOrphanedLogGroups(resources)).toHaveLength(0);
  });

  it('detects orphaned RDS instance log groups', () => {
    const resources = [
      logGroup('/aws/rds/instance/mydb/error'),
      rdsInstance('mydb'),
      logGroup('/aws/rds/instance/deleted-db/error'),
    ];
    const orphans = findOrphanedLogGroups(resources);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].expectedResource).toBe('deleted-db');
    expect(orphans[0].service).toBe('RDS');
  });

  it('detects orphaned RDS cluster log groups', () => {
    const resources = [
      logGroup('/aws/rds/cluster/my-cluster/audit'),
      rdsCluster('my-cluster'),
      logGroup('/aws/rds/cluster/gone-cluster/audit'),
    ];
    const orphans = findOrphanedLogGroups(resources);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].expectedResource).toBe('gone-cluster');
  });

  it('detects orphaned API Gateway log groups', () => {
    const resources = [
      logGroup('/aws/apigateway/abc123'),
      apiGateway('abc123', 'my-api'),
      logGroup('/aws/apigateway/deleted456'),
    ];
    const orphans = findOrphanedLogGroups(resources);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].expectedResource).toBe('deleted456');
    expect(orphans[0].service).toBe('API Gateway');
  });

  it('ignores non-AWS-prefixed log groups', () => {
    const resources = [
      logGroup('custom-app-logs'),
      logGroup('/my-company/service/logs'),
    ];
    expect(findOrphanedLogGroups(resources)).toHaveLength(0);
  });

  it('handles multiple orphan types simultaneously', () => {
    const resources = [
      logGroup('/aws/lambda/orphan-fn'),
      logGroup('/aws/rds/instance/orphan-db/error'),
      logGroup('/aws/apigateway/orphan-api'),
      logGroup('/aws/lambda/alive-fn'),
      lambdaFn('alive-fn'),
    ];
    const orphans = findOrphanedLogGroups(resources);
    expect(orphans).toHaveLength(3);
    const services = orphans.map((o) => o.service).sort();
    expect(services).toEqual(['API Gateway', 'Lambda', 'RDS']);
  });

  it('returns resource metadata in results', () => {
    const resources = [
      logGroup('/aws/lambda/gone', { metadata: { storedBytes: 5000, retentionDays: 7 } }),
    ];
    const orphans = findOrphanedLogGroups(resources);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].resource.metadata.storedBytes).toBe(5000);
    expect(orphans[0].resource.metadata.retentionDays).toBe(7);
  });

  it('handles empty resources array', () => {
    expect(findOrphanedLogGroups([])).toEqual([]);
  });

  it('handles large number of log groups', () => {
    const resources = [
      ...Array.from({ length: 200 }, (_, i) => logGroup(`/aws/lambda/fn-${i}`)),
      ...Array.from({ length: 50 }, (_, i) => lambdaFn(`fn-${i}`)),
    ];
    const orphans = findOrphanedLogGroups(resources);
    expect(orphans).toHaveLength(150);
  });
});
