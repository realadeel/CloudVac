import type { AWSProfile, Resource } from '../../../shared/types.js';
import { buildDeletionPlan, validateDeletionPlan, type DeletionNode } from './dependency-graph.js';
import { deleteStack } from './strategies/cloudformation.js';
import { terminateInstance } from './strategies/ec2.js';
import { deleteRDSInstance, deleteRDSCluster } from './strategies/rds.js';
import { deleteLoadBalancer } from './strategies/elb.js';
import { deleteVolume } from './strategies/ebs.js';
import { deleteNatGateway } from './strategies/nat.js';
import { releaseEIP } from './strategies/eip.js';
import { deleteLambdaFunction } from './strategies/lambda.js';
import { deleteS3Bucket } from './strategies/s3.js';
import { DELETE_CONCURRENCY } from '../config.js';

type Emit = (event: string, data: unknown) => void;

const deleteHandlers: Record<string, (profile: AWSProfile, resource: Resource, emit?: (msg: string) => void) => Promise<void>> = {
  'cloudformation-stack': deleteStack,
  'ec2-instance': terminateInstance,
  'rds-instance': deleteRDSInstance,
  'rds-cluster': deleteRDSCluster,
  'alb': deleteLoadBalancer,
  'nlb': deleteLoadBalancer,
  'clb': deleteLoadBalancer,
  'ebs-volume': deleteVolume,
  'nat-gateway': deleteNatGateway,
  'elastic-ip': releaseEIP,
  'lambda-function': deleteLambdaFunction,
  's3-bucket': deleteS3Bucket,
};

export async function executeDeletion(
  profile: AWSProfile,
  resources: Resource[],
  dryRun: boolean,
  emit: Emit
): Promise<void> {
  const plan = buildDeletionPlan(resources);
  const { warnings, errors } = validateDeletionPlan(plan, resources);

  emit('plan', {
    steps: plan.map((n, i) => ({
      step: i + 1,
      id: n.resource.id,
      name: n.resource.name,
      type: n.resource.type,
      region: n.resource.region,
      action: n.action,
      dependsOn: n.dependsOn,
      priority: n.priority,
    })),
    warnings,
    errors,
  });

  if (dryRun) {
    emit('dry_run_complete', {
      wouldDelete: plan.length,
      warnings,
      errors,
    });
    return;
  }

  if (errors.length > 0) {
    emit('error', { message: 'Deletion plan has errors, aborting.', errors });
    return;
  }

  // Group by priority tier and execute tiers sequentially
  const tiers = new Map<number, DeletionNode[]>();
  for (const node of plan) {
    if (!tiers.has(node.priority)) tiers.set(node.priority, []);
    tiers.get(node.priority)!.push(node);
  }

  const sortedTierKeys = [...tiers.keys()].sort((a, b) => a - b);
  let completed = 0;
  const total = plan.length;

  for (const tierKey of sortedTierKeys) {
    const tierNodes = tiers.get(tierKey)!;

    // Execute within tier with concurrency limit
    const executing = new Set<Promise<void>>();

    for (const node of tierNodes) {
      const promise = (async () => {
        const step = plan.indexOf(node) + 1;
        emit('deleting', {
          id: node.resource.id,
          name: node.resource.name,
          step,
          action: node.action,
          region: node.resource.region,
        });

        const start = Date.now();
        try {
          const handler = deleteHandlers[node.resource.type];
          if (!handler) {
            throw new Error(`No deletion handler for type: ${node.resource.type}`);
          }

          await handler(profile, node.resource, (msg) => {
            emit('progress', { id: node.resource.id, message: msg });
          });

          completed++;
          emit('deleted', {
            id: node.resource.id,
            name: node.resource.name,
            step,
            success: true,
            duration: Date.now() - start,
            progress: completed / total,
          });
        } catch (err) {
          completed++;
          emit('delete_failed', {
            id: node.resource.id,
            name: node.resource.name,
            step,
            success: false,
            error: (err as Error).message,
            duration: Date.now() - start,
            progress: completed / total,
          });
        }
      })();

      executing.add(promise);
      promise.then(() => executing.delete(promise));

      if (executing.size >= DELETE_CONCURRENCY) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
  }

  emit('complete', {
    deleted: completed,
    total,
    failed: total - completed,
  });
}
