import { DescribeNatGatewaysCommand } from '@aws-sdk/client-ec2';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanNAT(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const client = clients.ec2(profile, region);
  const resources: Resource[] = [];
  let nextToken: string | undefined;

  do {
    const resp = await client.send(new DescribeNatGatewaysCommand({ NextToken: nextToken }));

    for (const nat of resp.NatGateways ?? []) {
      if (nat.State === 'deleted') continue;

      const nameTag = nat.Tags?.find((t) => t.Key === 'Name')?.Value;
      const eipAllocationId = nat.NatGatewayAddresses?.[0]?.AllocationId;
      const publicIp = nat.NatGatewayAddresses?.[0]?.PublicIp;

      resources.push({
        id: nat.NatGatewayId!,
        type: 'nat-gateway',
        name: nameTag ?? nat.NatGatewayId!,
        region,
        service: 'nat',
        status: nat.State ?? 'unknown',
        createdAt: nat.CreateTime?.toISOString(),
        managed: false,
        metadata: {
          vpcId: nat.VpcId,
          subnetId: nat.SubnetId,
          publicIp,
          eipAllocationId,
          connectivityType: nat.ConnectivityType,
          tags: nat.Tags?.reduce((acc, t) => ({ ...acc, [t.Key!]: t.Value }), {}),
        },
      });
    }

    nextToken = resp.NextToken;
  } while (nextToken);

  return resources;
}
