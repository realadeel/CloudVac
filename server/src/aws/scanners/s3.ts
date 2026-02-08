import { ListBucketsCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import { REGIONS } from '../../config.js';
import * as clients from '../clients.js';

export async function scanS3(profile: AWSProfile, _region: Region): Promise<Resource[]> {
  // S3 ListBuckets is global — only run once from us-east-1
  if (_region !== 'us-east-1') return [];

  const client = clients.s3(profile, 'us-east-1');

  const resp = await client.send(new ListBucketsCommand({}));
  const buckets = resp.Buckets ?? [];

  // Fetch all bucket locations in parallel
  const located = await Promise.all(
    buckets.map(async (bucket) => {
      let region = 'us-east-1';
      try {
        const locResp = await client.send(new GetBucketLocationCommand({ Bucket: bucket.Name! }));
        region = locResp.LocationConstraint || 'us-east-1';
      } catch {
        // Default to us-east-1 if we can't get location
      }
      return { bucket, region };
    })
  );

  const resources: Resource[] = [];
  for (const { bucket, region } of located) {
    if (!REGIONS.includes(region as Region)) continue;

    resources.push({
      id: bucket.Name!,
      type: 's3-bucket',
      name: bucket.Name!,
      region,
      service: 's3',
      status: 'active',
      createdAt: bucket.CreationDate?.toISOString(),
      managed: false,
      metadata: { bucketRegion: region },
    });
  }

  return resources;
}
