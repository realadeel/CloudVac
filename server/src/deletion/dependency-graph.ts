import type { Resource } from '../../../shared/types.js';

export interface DeletionNode {
  resource: Resource;
  dependsOn: string[];
  priority: number;
  action: string;
}

const PRIORITY: Record<string, number> = {
  'cloudformation-stack': 0,
  'ec2-instance': 1,
  'nat-gateway': 1,
  'alb': 1,
  'nlb': 1,
  'clb': 1,
  'rds-instance': 1,
  'rds-cluster': 1,
  'lambda-function': 2,
  'ebs-volume': 3,
  'elastic-ip': 3,
  's3-bucket': 4,
};

const ACTIONS: Record<string, string> = {
  'cloudformation-stack': 'Delete CloudFormation stack',
  'ec2-instance': 'Terminate EC2 instance',
  'rds-instance': 'Delete RDS instance',
  'rds-cluster': 'Delete RDS cluster',
  'alb': 'Delete Application Load Balancer',
  'nlb': 'Delete Network Load Balancer',
  'clb': 'Delete Classic Load Balancer',
  'ebs-volume': 'Delete EBS volume',
  'nat-gateway': 'Delete NAT Gateway',
  'elastic-ip': 'Release Elastic IP',
  'lambda-function': 'Delete Lambda function',
  's3-bucket': 'Empty and delete S3 bucket',
};

export function buildDeletionPlan(resources: Resource[]): DeletionNode[] {
  const resourceSet = new Set(resources.map((r) => r.id));
  const nodes: DeletionNode[] = [];

  // Group CF-managed resources by stack
  const stackResources = new Map<string, Resource[]>();
  const looseResources: Resource[] = [];

  for (const r of resources) {
    if (r.type === 'cloudformation-stack') {
      // Stack deletion is handled as a unit
      nodes.push({
        resource: r,
        dependsOn: [],
        priority: 0,
        action: ACTIONS[r.type],
      });
    } else if (r.managed && r.stackId && resourceSet.has(r.stackId)) {
      // This resource belongs to a stack that's also being deleted — skip individual deletion
      if (!stackResources.has(r.stackId)) stackResources.set(r.stackId, []);
      stackResources.get(r.stackId)!.push(r);
    } else {
      looseResources.push(r);
    }
  }

  // Build dependency edges for loose resources
  for (const r of looseResources) {
    const deps: string[] = [];

    if (r.type === 'ebs-volume') {
      const attachedTo = r.metadata.attachedTo as string | undefined;
      if (attachedTo && resourceSet.has(attachedTo)) {
        deps.push(attachedTo);
      }
    }

    if (r.type === 'elastic-ip') {
      // If a NAT gateway using this EIP is also being deleted, delete NAT first
      const natUsingThis = looseResources.find(
        (other) => other.type === 'nat-gateway' && other.metadata.eipAllocationId === r.id
      );
      if (natUsingThis) {
        deps.push(natUsingThis.id);
      }
    }

    nodes.push({
      resource: r,
      dependsOn: deps,
      priority: PRIORITY[r.type] ?? 5,
      action: ACTIONS[r.type] ?? `Delete ${r.type}`,
    });
  }

  // Topological sort by priority then dependencies
  return topologicalSort(nodes);
}

function topologicalSort(nodes: DeletionNode[]): DeletionNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.resource.id, n]));
  const visited = new Set<string>();
  const sorted: DeletionNode[] = [];

  // Sort by priority first
  const byPriority = [...nodes].sort((a, b) => a.priority - b.priority);

  function visit(node: DeletionNode) {
    if (visited.has(node.resource.id)) return;
    visited.add(node.resource.id);

    for (const depId of node.dependsOn) {
      const dep = nodeMap.get(depId);
      if (dep && !visited.has(depId)) {
        visit(dep);
      }
    }

    sorted.push(node);
  }

  for (const node of byPriority) {
    visit(node);
  }

  return sorted;
}

export function validateDeletionPlan(
  plan: DeletionNode[],
  allResources: Resource[]
): { warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];
  const deletingIds = new Set(plan.map((n) => n.resource.id));

  for (const node of plan) {
    const r = node.resource;

    // Warn about attached EBS volumes if instance not in deletion set
    if (r.type === 'ebs-volume' && r.metadata.attached && r.metadata.attachedTo) {
      if (!deletingIds.has(r.metadata.attachedTo as string)) {
        warnings.push(
          `EBS volume ${r.id} is attached to instance ${r.metadata.attachedTo} which is NOT being deleted. Volume deletion will fail unless detached first.`
        );
      }
    }

    // Warn about S3 buckets
    if (r.type === 's3-bucket') {
      warnings.push(`S3 bucket "${r.name}" will be emptied (all objects deleted) before bucket deletion.`);
    }

    // Warn about RDS without final snapshot
    if (r.type === 'rds-instance' || r.type === 'rds-cluster') {
      warnings.push(`RDS ${r.type === 'rds-cluster' ? 'cluster' : 'instance'} "${r.name}" will be deleted without a final snapshot.`);
    }
  }

  return { warnings, errors };
}
