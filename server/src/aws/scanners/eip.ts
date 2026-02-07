import { DescribeAddressesCommand } from '@aws-sdk/client-ec2';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanEIP(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const client = clients.ec2(profile, region);
  const resources: Resource[] = [];

  const resp = await client.send(new DescribeAddressesCommand({}));

  for (const addr of resp.Addresses ?? []) {
    const nameTag = addr.Tags?.find((t) => t.Key === 'Name')?.Value;
    const associated = !!addr.AssociationId;

    resources.push({
      id: addr.AllocationId!,
      type: 'elastic-ip',
      name: nameTag ?? addr.PublicIp ?? addr.AllocationId!,
      region,
      service: 'eip',
      status: associated ? `associated:${addr.InstanceId ?? addr.NetworkInterfaceId}` : 'unassociated',
      managed: false,
      metadata: {
        publicIp: addr.PublicIp,
        associated,
        instanceId: addr.InstanceId,
        networkInterfaceId: addr.NetworkInterfaceId,
        domain: addr.Domain,
        tags: addr.Tags?.reduce((acc, t) => ({ ...acc, [t.Key!]: t.Value }), {}),
      },
    });
  }

  return resources;
}
