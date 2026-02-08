import { describe, it, expect } from 'vitest';
import { buildDeletionPlan, validateDeletionPlan } from './dependency-graph.js';
import type { Resource } from '../../../shared/types.js';

function makeResource(overrides: Partial<Resource> & { type: Resource['type']; id: string }): Resource {
  const { type, id, ...rest } = overrides;
  return {
    id,
    type,
    name: id,
    region: 'us-east-1',
    service: 'ec2' as any,
    status: 'active',
    managed: false,
    metadata: {},
    ...rest,
  };
}

// ---------------------------------------------------------------------------
// Basic plan building
// ---------------------------------------------------------------------------
describe('buildDeletionPlan', () => {
  it('returns empty plan for empty input', () => {
    expect(buildDeletionPlan([])).toEqual([]);
  });

  it('creates a plan for a single resource', () => {
    const resources = [makeResource({ id: 'i-123', type: 'ec2-instance' })];
    const plan = buildDeletionPlan(resources);
    expect(plan).toHaveLength(1);
    expect(plan[0].resource.id).toBe('i-123');
    expect(plan[0].action).toBe('Terminate EC2 instance');
  });

  it('assigns correct priorities to different resource types', () => {
    const resources = [
      makeResource({ id: 'vpc-1', type: 'vpc', metadata: {} }),
      makeResource({ id: 'i-1', type: 'ec2-instance' }),
      makeResource({ id: 'sg-1', type: 'security-group', metadata: {} }),
      makeResource({ id: 'fn-1', type: 'lambda-function' }),
    ];
    const plan = buildDeletionPlan(resources);
    const priorities = plan.map((n) => ({ id: n.resource.id, priority: n.priority }));

    // EC2 (1) should come before Lambda (2), Lambda before SG (4), SG before VPC (6)
    const ec2Idx = plan.findIndex((n) => n.resource.id === 'i-1');
    const lambdaIdx = plan.findIndex((n) => n.resource.id === 'fn-1');
    const sgIdx = plan.findIndex((n) => n.resource.id === 'sg-1');
    const vpcIdx = plan.findIndex((n) => n.resource.id === 'vpc-1');

    expect(ec2Idx).toBeLessThan(lambdaIdx);
    expect(lambdaIdx).toBeLessThan(sgIdx);
    expect(sgIdx).toBeLessThan(vpcIdx);
  });
});

// ---------------------------------------------------------------------------
// Dependency edges
// ---------------------------------------------------------------------------
describe('dependency edges', () => {
  it('EBS volume depends on attached EC2 instance', () => {
    const resources = [
      makeResource({ id: 'i-1', type: 'ec2-instance' }),
      makeResource({ id: 'vol-1', type: 'ebs-volume', metadata: { attachedTo: 'i-1' } }),
    ];
    const plan = buildDeletionPlan(resources);
    const volNode = plan.find((n) => n.resource.id === 'vol-1')!;
    expect(volNode.dependsOn).toContain('i-1');

    // EC2 instance should appear before EBS volume in sorted plan
    const ec2Idx = plan.findIndex((n) => n.resource.id === 'i-1');
    const volIdx = plan.findIndex((n) => n.resource.id === 'vol-1');
    expect(ec2Idx).toBeLessThan(volIdx);
  });

  it('EBS volume has no dependency when instance not in deletion set', () => {
    const resources = [
      makeResource({ id: 'vol-1', type: 'ebs-volume', metadata: { attachedTo: 'i-999' } }),
    ];
    const plan = buildDeletionPlan(resources);
    expect(plan[0].dependsOn).toEqual([]);
  });

  it('VPC depends on its subnets, SGs, IGWs, and route tables', () => {
    const resources = [
      makeResource({ id: 'vpc-1', type: 'vpc', metadata: {} }),
      makeResource({ id: 'subnet-1', type: 'subnet', metadata: { vpcId: 'vpc-1' } }),
      makeResource({ id: 'sg-1', type: 'security-group', metadata: { vpcId: 'vpc-1' } }),
      makeResource({ id: 'igw-1', type: 'internet-gateway', metadata: { vpcId: 'vpc-1' } }),
      makeResource({ id: 'rtb-1', type: 'route-table', metadata: { vpcId: 'vpc-1' } }),
    ];
    const plan = buildDeletionPlan(resources);
    const vpcNode = plan.find((n) => n.resource.id === 'vpc-1')!;
    expect(vpcNode.dependsOn).toContain('subnet-1');
    expect(vpcNode.dependsOn).toContain('sg-1');
    expect(vpcNode.dependsOn).toContain('igw-1');
    expect(vpcNode.dependsOn).toContain('rtb-1');

    // VPC should be last in the sorted plan
    const vpcIdx = plan.findIndex((n) => n.resource.id === 'vpc-1');
    expect(vpcIdx).toBe(plan.length - 1);
  });

  it('Elastic IP depends on NAT Gateway using it', () => {
    const resources = [
      makeResource({ id: 'eip-1', type: 'elastic-ip', metadata: {} }),
      makeResource({ id: 'nat-1', type: 'nat-gateway', metadata: { eipAllocationId: 'eip-1' } }),
    ];
    const plan = buildDeletionPlan(resources);
    const eipNode = plan.find((n) => n.resource.id === 'eip-1')!;
    expect(eipNode.dependsOn).toContain('nat-1');
  });
});

// ---------------------------------------------------------------------------
// CloudFormation stack deduplication
// ---------------------------------------------------------------------------
describe('CF stack deduplication', () => {
  it('skips managed resources when their stack is also being deleted', () => {
    const resources = [
      makeResource({ id: 'stack-1', type: 'cloudformation-stack' }),
      makeResource({
        id: 'i-1',
        type: 'ec2-instance',
        managed: true,
        stackId: 'stack-1',
        stackName: 'my-stack',
      }),
    ];
    const plan = buildDeletionPlan(resources);
    // Only the stack should be in the plan, not the managed instance
    expect(plan).toHaveLength(1);
    expect(plan[0].resource.id).toBe('stack-1');
  });

  it('includes managed resources when their stack is NOT in deletion set', () => {
    const resources = [
      makeResource({
        id: 'i-1',
        type: 'ec2-instance',
        managed: true,
        stackId: 'stack-99',
        stackName: 'other-stack',
      }),
    ];
    const plan = buildDeletionPlan(resources);
    expect(plan).toHaveLength(1);
    expect(plan[0].resource.id).toBe('i-1');
  });
});

// ---------------------------------------------------------------------------
// Topological sort
// ---------------------------------------------------------------------------
describe('topological sort', () => {
  it('respects dependency ordering across tiers', () => {
    const resources = [
      makeResource({ id: 'vpc-1', type: 'vpc', metadata: {} }),
      makeResource({ id: 'subnet-1', type: 'subnet', metadata: { vpcId: 'vpc-1' } }),
      makeResource({ id: 'i-1', type: 'ec2-instance' }),
      makeResource({ id: 'vol-1', type: 'ebs-volume', metadata: { attachedTo: 'i-1' } }),
    ];
    const plan = buildDeletionPlan(resources);
    const ids = plan.map((n) => n.resource.id);

    // i-1 before vol-1
    expect(ids.indexOf('i-1')).toBeLessThan(ids.indexOf('vol-1'));
    // subnet-1 before vpc-1
    expect(ids.indexOf('subnet-1')).toBeLessThan(ids.indexOf('vpc-1'));
  });

  it('handles resources with no dependencies', () => {
    const resources = [
      makeResource({ id: 'fn-1', type: 'lambda-function' }),
      makeResource({ id: 'fn-2', type: 'lambda-function' }),
      makeResource({ id: 'fn-3', type: 'lambda-function' }),
    ];
    const plan = buildDeletionPlan(resources);
    expect(plan).toHaveLength(3);
    // All should have no dependencies
    for (const node of plan) {
      expect(node.dependsOn).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// Plan validation
// ---------------------------------------------------------------------------
describe('validateDeletionPlan', () => {
  it('warns about attached EBS volumes not in deletion set', () => {
    const allResources = [
      makeResource({ id: 'vol-1', type: 'ebs-volume', metadata: { attached: true, attachedTo: 'i-999' } }),
    ];
    const plan = buildDeletionPlan(allResources);
    const { warnings, errors } = validateDeletionPlan(plan, allResources);
    expect(warnings.some((w) => w.includes('vol-1') && w.includes('i-999'))).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('warns about S3 bucket emptying', () => {
    const allResources = [
      makeResource({ id: 'my-bucket', type: 's3-bucket', name: 'my-bucket' }),
    ];
    const plan = buildDeletionPlan(allResources);
    const { warnings } = validateDeletionPlan(plan, allResources);
    expect(warnings.some((w) => w.includes('my-bucket') && w.includes('emptied'))).toBe(true);
  });

  it('warns about RDS deletion without final snapshot', () => {
    const allResources = [
      makeResource({ id: 'db-1', type: 'rds-instance', name: 'my-db' }),
    ];
    const plan = buildDeletionPlan(allResources);
    const { warnings } = validateDeletionPlan(plan, allResources);
    expect(warnings.some((w) => w.includes('my-db') && w.includes('without a final snapshot'))).toBe(true);
  });

  it('warns about DynamoDB permanent deletion', () => {
    const allResources = [
      makeResource({ id: 'table-1', type: 'dynamodb-table', name: 'users' }),
    ];
    const plan = buildDeletionPlan(allResources);
    const { warnings } = validateDeletionPlan(plan, allResources);
    expect(warnings.some((w) => w.includes('users') && w.includes('permanently deleted'))).toBe(true);
  });

  it('errors on default security group', () => {
    const allResources = [
      makeResource({ id: 'sg-default', type: 'security-group', name: 'default', metadata: {} }),
    ];
    const plan = buildDeletionPlan(allResources);
    const { errors } = validateDeletionPlan(plan, allResources);
    expect(errors.some((e) => e.includes('default security group'))).toBe(true);
  });

  it('returns clean result for safe deletions', () => {
    const allResources = [
      makeResource({ id: 'fn-1', type: 'lambda-function', name: 'my-fn' }),
    ];
    const plan = buildDeletionPlan(allResources);
    const { warnings, errors } = validateDeletionPlan(plan, allResources);
    expect(warnings).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
describe('action labels', () => {
  const expectedActions: Record<string, string> = {
    'ec2-instance': 'Terminate EC2 instance',
    'ebs-volume': 'Delete EBS volume',
    'nat-gateway': 'Delete NAT Gateway',
    'elastic-ip': 'Release Elastic IP',
    'lambda-function': 'Delete Lambda function',
    's3-bucket': 'Empty and delete S3 bucket',
    'vpc': 'Delete VPC',
    'internet-gateway': 'Detach and delete Internet Gateway',
    'cloudformation-stack': 'Delete CloudFormation stack',
    'cloudwatch-alarm': 'Delete CloudWatch Alarm',
  };

  for (const [type, expected] of Object.entries(expectedActions)) {
    it(`uses correct action for ${type}`, () => {
      const resources = [makeResource({ id: `test-${type}`, type: type as Resource['type'] })];
      const plan = buildDeletionPlan(resources);
      expect(plan[0].action).toBe(expected);
    });
  }
});
