import { DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanEC2(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const client = clients.ec2(profile, region);
  const resources: Resource[] = [];
  let nextToken: string | undefined;

  do {
    const resp = await client.send(new DescribeInstancesCommand({ NextToken: nextToken }));

    for (const reservation of resp.Reservations ?? []) {
      for (const inst of reservation.Instances ?? []) {
        if (inst.State?.Name === 'terminated') continue;

        const nameTag = inst.Tags?.find((t) => t.Key === 'Name')?.Value;
        resources.push({
          id: inst.InstanceId!,
          arn: `arn:aws:ec2:${region}:*:instance/${inst.InstanceId}`,
          type: 'ec2-instance',
          name: nameTag ?? inst.InstanceId!,
          region,
          service: 'ec2',
          status: inst.State?.Name ?? 'unknown',
          createdAt: inst.LaunchTime?.toISOString(),
          managed: false,
          metadata: {
            instanceType: inst.InstanceType,
            publicIp: inst.PublicIpAddress,
            privateIp: inst.PrivateIpAddress,
            vpcId: inst.VpcId,
            subnetId: inst.SubnetId,
            az: inst.Placement?.AvailabilityZone,
            tags: inst.Tags?.reduce((acc, t) => ({ ...acc, [t.Key!]: t.Value }), {}),
          },
        });
      }
    }

    nextToken = resp.NextToken;
  } while (nextToken);

  return resources;
}
