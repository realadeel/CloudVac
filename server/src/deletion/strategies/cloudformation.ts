import { DeleteStackCommand, DescribeStackResourcesCommand } from '@aws-sdk/client-cloudformation';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';
import { emptyS3Bucket } from './s3.js';

export async function deleteStack(
  profile: AWSProfile,
  resource: Resource,
  emit?: (msg: string) => void
): Promise<void> {
  const cfClient = clients.cloudformation(profile, resource.region as Region);

  // Before deleting, find S3 buckets in this stack and empty them
  // (CF can't delete non-empty buckets)
  try {
    const stackResources = await cfClient.send(
      new DescribeStackResourcesCommand({ StackName: resource.id })
    );

    const s3Buckets = (stackResources.StackResources ?? []).filter(
      (r) => r.ResourceType === 'AWS::S3::Bucket' && r.PhysicalResourceId
    );

    if (s3Buckets.length > 0) {
      emit?.(`Found ${s3Buckets.length} S3 bucket(s) in stack — emptying before deletion...`);

      for (const bucket of s3Buckets) {
        const bucketName = bucket.PhysicalResourceId!;
        emit?.(`Emptying bucket "${bucketName}" in stack "${resource.name}"...`);

        // Build a minimal Resource object so emptyS3Bucket can work
        const bucketResource: Resource = {
          id: bucketName,
          type: 's3-bucket',
          name: bucketName,
          region: resource.region,
          service: 's3',
          status: 'active',
          managed: true,
          metadata: { bucketRegion: resource.region },
        };

        try {
          const count = await emptyS3Bucket(profile, bucketResource, emit);
          emit?.(`Emptied "${bucketName}" (${count} objects removed).`);
        } catch (err) {
          emit?.(`Warning: failed to empty bucket "${bucketName}": ${(err as Error).message}. Stack deletion may fail.`);
        }
      }
    }
  } catch (err) {
    // If we can't list stack resources, proceed with deletion anyway
    // CF might still succeed if buckets are already empty
    emit?.(`Warning: could not inspect stack resources: ${(err as Error).message}`);
  }

  emit?.(`Deleting stack "${resource.name}"...`);
  await cfClient.send(new DeleteStackCommand({ StackName: resource.id }));
}
