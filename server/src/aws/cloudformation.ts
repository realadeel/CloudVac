import {
  ListStacksCommand,
  ListStackResourcesCommand,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import type { AWSProfile, CFStack, CFStackResource } from '../../../shared/types.js';
import type { Region } from '../config.js';
import * as clients from './clients.js';

const ACTIVE_STATUSES: string[] = [
  StackStatus.CREATE_COMPLETE,
  StackStatus.UPDATE_COMPLETE,
  StackStatus.UPDATE_ROLLBACK_COMPLETE,
  StackStatus.ROLLBACK_COMPLETE,
  StackStatus.IMPORT_COMPLETE,
];

export async function discoverStacks(
  profile: AWSProfile,
  region: Region,
  emit?: (event: { type: string; [k: string]: unknown }) => void
): Promise<CFStack[]> {
  const client = clients.cloudformation(profile, region);
  const stacks: CFStack[] = [];

  let nextToken: string | undefined;
  do {
    const resp = await client.send(
      new ListStacksCommand({
        StackStatusFilter: ACTIVE_STATUSES as StackStatus[],
        NextToken: nextToken,
      })
    );

    for (const summary of resp.StackSummaries ?? []) {
      const resources = await listStackResources(client, summary.StackName!);

      const stack: CFStack = {
        stackId: summary.StackId!,
        stackName: summary.StackName!,
        status: summary.StackStatus!,
        createdAt: summary.CreationTime?.toISOString() ?? '',
        updatedAt: summary.LastUpdatedTime?.toISOString(),
        region,
        resources,
      };

      stacks.push(stack);
      emit?.({
        type: 'stack_found',
        stackName: stack.stackName,
        region,
        resourceCount: resources.length,
        status: stack.status,
      });
    }

    nextToken = resp.NextToken;
  } while (nextToken);

  return stacks;
}

async function listStackResources(
  client: ReturnType<typeof clients.cloudformation>,
  stackName: string
): Promise<CFStackResource[]> {
  const resources: CFStackResource[] = [];
  let nextToken: string | undefined;

  do {
    const resp = await client.send(
      new ListStackResourcesCommand({
        StackName: stackName,
        NextToken: nextToken,
      })
    );

    for (const r of resp.StackResourceSummaries ?? []) {
      resources.push({
        logicalId: r.LogicalResourceId!,
        physicalId: r.PhysicalResourceId ?? '',
        type: r.ResourceType!,
        status: r.ResourceStatus!,
      });
    }

    nextToken = resp.NextToken;
  } while (nextToken);

  return resources;
}
