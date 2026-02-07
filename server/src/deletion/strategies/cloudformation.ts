import { DeleteStackCommand } from '@aws-sdk/client-cloudformation';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';

export async function deleteStack(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.cloudformation(profile, resource.region as Region);
  await client.send(new DeleteStackCommand({ StackName: resource.id }));
}
