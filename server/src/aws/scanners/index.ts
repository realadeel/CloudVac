import type { AWSProfile, Resource, CFStack } from '../../../../shared/types.js';
import { REGIONS, SCANNABLE_SERVICES, SCAN_CONCURRENCY } from '../../config.js';
import type { Region, ScannableService } from '../../config.js';
import { discoverStacks } from '../cloudformation.js';
import { scanEC2 } from './ec2.js';
import { scanRDS } from './rds.js';
import { scanELB } from './elb.js';
import { scanEBS } from './ebs.js';
import { scanNAT } from './nat.js';
import { scanEIP } from './eip.js';
import { scanLambda } from './lambda.js';
import { scanS3 } from './s3.js';
import { scanDynamoDB } from './dynamodb.js';
import { scanVPC } from './vpc.js';
import { scanCloudWatch } from './cloudwatch.js';
import { scanSNS } from './sns.js';
import { scanSQS } from './sqs.js';
import { scanAPIGateway } from './apigateway.js';

const scannerMap: Record<ScannableService, (profile: AWSProfile, region: Region) => Promise<Resource[]>> = {
  ec2: scanEC2,
  rds: scanRDS,
  elb: scanELB,
  ebs: scanEBS,
  nat: scanNAT,
  eip: scanEIP,
  lambda: scanLambda,
  s3: scanS3,
  dynamodb: scanDynamoDB,
  vpc: scanVPC,
  cloudwatch: scanCloudWatch,
  sns: scanSNS,
  sqs: scanSQS,
  apigateway: scanAPIGateway,
};

interface ScanResult {
  resources: Resource[];
  stacks: CFStack[];
}

export async function runFullScan(
  profile: AWSProfile,
  emit: (event: { type: string; [k: string]: unknown }) => void
): Promise<ScanResult> {
  const allResources: Resource[] = [];
  const allStacks: CFStack[] = [];

  // Phase 1: CloudFormation discovery
  emit({ type: 'phase', phase: 'cloudformation', status: 'started' });

  const cfPromises = REGIONS.map((region) => discoverStacks(profile, region, emit));
  const cfResults = await Promise.all(cfPromises);
  for (const stacks of cfResults) {
    allStacks.push(...stacks);
  }

  // Build set of managed physical resource IDs
  const managedIds = new Set<string>();
  for (const stack of allStacks) {
    for (const r of stack.resources) {
      if (r.physicalId) managedIds.add(r.physicalId);
    }
  }

  // Add stacks themselves as resources
  for (const stack of allStacks) {
    allResources.push({
      id: stack.stackId,
      type: 'cloudformation-stack',
      name: stack.stackName,
      region: stack.region,
      service: 'cloudformation',
      status: stack.status,
      createdAt: stack.createdAt,
      lastModified: stack.updatedAt,
      managed: false,
      metadata: {
        resourceCount: stack.resources.length,
        resources: stack.resources.map((r) => ({ logicalId: r.logicalId, type: r.type, physicalId: r.physicalId })),
      },
    });
  }

  emit({
    type: 'phase',
    phase: 'cloudformation',
    status: 'completed',
    stackCount: allStacks.length,
    managedResourceCount: managedIds.size,
  });

  // Phase 2: Service scanning with concurrency limit
  emit({ type: 'phase', phase: 'services', status: 'started' });

  const tasks: { service: ScannableService; region: Region }[] = [];
  for (const region of REGIONS) {
    for (const service of SCANNABLE_SERVICES) {
      tasks.push({ service, region });
    }
  }

  let completed = 0;
  const total = tasks.length;

  // Process tasks with concurrency limit
  const executing = new Set<Promise<void>>();
  for (const task of tasks) {
    const promise = (async () => {
      emit({ type: 'scanning', service: task.service, region: task.region, progress: completed / total });
      try {
        const resources = await scannerMap[task.service](profile, task.region);

        // Mark managed resources
        for (const r of resources) {
          if (managedIds.has(r.id) || managedIds.has(r.name)) {
            r.managed = true;
            // Find which stack owns this resource
            for (const stack of allStacks) {
              const match = stack.resources.find((sr) => sr.physicalId === r.id || sr.physicalId === r.name);
              if (match) {
                r.stackId = stack.stackId;
                r.stackName = stack.stackName;
                break;
              }
            }
          }
        }

        allResources.push(...resources);
        completed++;
        emit({
          type: 'service_complete',
          service: task.service,
          region: task.region,
          count: resources.length,
          progress: completed / total,
        });
      } catch (err) {
        completed++;
        emit({
          type: 'service_error',
          service: task.service,
          region: task.region,
          error: (err as Error).message,
          progress: completed / total,
        });
      }
    })();

    executing.add(promise);
    promise.then(() => executing.delete(promise));

    if (executing.size >= SCAN_CONCURRENCY) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);

  emit({
    type: 'scan_complete',
    totalResources: allResources.length,
    managed: allResources.filter((r) => r.managed).length,
    loose: allResources.filter((r) => !r.managed && r.type !== 'cloudformation-stack').length,
    stacks: allStacks.length,
  });

  return { resources: allResources, stacks: allStacks };
}
