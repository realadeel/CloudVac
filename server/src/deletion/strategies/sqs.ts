import { DeleteQueueCommand } from '@aws-sdk/client-sqs';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';

export async function deleteSQSQueue(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.sqs(profile, resource.region as Region);
  const queueUrl = resource.metadata.queueUrl as string;
  await client.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
}
