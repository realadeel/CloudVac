import { DescribeVolumesCommand } from '@aws-sdk/client-ec2';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanEBS(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const client = clients.ec2(profile, region);
  const resources: Resource[] = [];
  let nextToken: string | undefined;

  do {
    const resp = await client.send(new DescribeVolumesCommand({ NextToken: nextToken }));

    for (const vol of resp.Volumes ?? []) {
      const nameTag = vol.Tags?.find((t) => t.Key === 'Name')?.Value;
      const attached = (vol.Attachments ?? []).length > 0;
      const attachedTo = vol.Attachments?.[0]?.InstanceId;

      resources.push({
        id: vol.VolumeId!,
        arn: `arn:aws:ec2:${region}:*:volume/${vol.VolumeId}`,
        type: 'ebs-volume',
        name: nameTag ?? vol.VolumeId!,
        region,
        service: 'ebs',
        status: attached ? `attached:${attachedTo}` : 'available',
        createdAt: vol.CreateTime?.toISOString(),
        managed: false,
        metadata: {
          size: vol.Size,
          volumeType: vol.VolumeType,
          iops: vol.Iops,
          throughput: vol.Throughput,
          encrypted: vol.Encrypted,
          attached,
          attachedTo,
          az: vol.AvailabilityZone,
          tags: vol.Tags?.reduce((acc, t) => ({ ...acc, [t.Key!]: t.Value }), {}),
        },
      });
    }

    nextToken = resp.NextToken;
  } while (nextToken);

  return resources;
}
