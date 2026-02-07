import {
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
  DeleteBucketCommand,
} from '@aws-sdk/client-s3';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import * as clients from '../../aws/clients.js';

export async function deleteS3Bucket(
  profile: AWSProfile,
  resource: Resource,
  emit?: (msg: string) => void
): Promise<void> {
  // S3 client uses the bucket's region
  const region = (resource.metadata.bucketRegion as string) || resource.region;
  const client = clients.s3(profile, region as any);
  const bucketName = resource.name;

  // Empty the bucket first (including versions and delete markers)
  emit?.(`Emptying bucket "${bucketName}"...`);

  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    const listResp = await client.send(
      new ListObjectVersionsCommand({
        Bucket: bucketName,
        MaxKeys: 1000,
      })
    );

    const objects: { Key: string; VersionId?: string }[] = [];

    for (const v of listResp.Versions ?? []) {
      if (v.Key) objects.push({ Key: v.Key, VersionId: v.VersionId });
    }
    for (const dm of listResp.DeleteMarkers ?? []) {
      if (dm.Key) objects.push({ Key: dm.Key, VersionId: dm.VersionId });
    }

    if (objects.length === 0) {
      hasMore = false;
      break;
    }

    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: { Objects: objects, Quiet: true },
      })
    );

    totalDeleted += objects.length;
    emit?.(`Deleted ${totalDeleted} objects from "${bucketName}"...`);

    hasMore = !!(listResp.IsTruncated);
  }

  // Delete the bucket
  emit?.(`Deleting bucket "${bucketName}"...`);
  await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
}
