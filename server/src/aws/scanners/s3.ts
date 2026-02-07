import { ListBucketsCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import { REGIONS } from '../../config.js';
import * as clients from '../clients.js';

export async function scanS3(profile: AWSProfile, _region: Region): Promise<Resource[]> {
  // S3 ListBuckets is global — only run once from us-east-1
  if (_region !== 'us-east-1') return [];

  const client = clients.s3(profile, 'us-east-1');
  const resources: Resource[] = [];

  const resp = await client.send(new ListBucketsCommand({}));

  for (const bucket of resp.Buckets ?? []) {
    let bucketRegion = 'us-east-1';
    try {
      const locResp = await client.send(new GetBucketLocationCommand({ Bucket: bucket.Name! }));
      bucketRegion = locResp.LocationConstraint || 'us-east-1';
    } catch {
      // If we can't get location, skip or default
    }

    // Only include buckets in our target regions
    if (!REGIONS.includes(bucketRegion as Region)) continue;

    resources.push({
      id: bucket.Name!,
      type: 's3-bucket',
      name: bucket.Name!,
      region: bucketRegion,
      service: 's3',
      status: 'active',
      createdAt: bucket.CreationDate?.toISOString(),
      managed: false,
      metadata: {
        bucketRegion,
      },
    });
  }

  return resources;
}
