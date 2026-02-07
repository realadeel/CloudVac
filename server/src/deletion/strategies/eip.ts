import { ReleaseAddressCommand } from '@aws-sdk/client-ec2';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';

export async function releaseEIP(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.ec2(profile, resource.region as Region);
  await client.send(new ReleaseAddressCommand({ AllocationId: resource.id }));
}
