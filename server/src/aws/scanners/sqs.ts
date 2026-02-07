import { ListQueuesCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanSQS(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const client = clients.sqs(profile, region);
  const resources: Resource[] = [];
  let nextToken: string | undefined;

  do {
    const resp = await client.send(new ListQueuesCommand({ NextToken: nextToken, MaxResults: 100 }));

    for (const queueUrl of resp.QueueUrls ?? []) {
      const name = queueUrl.split('/').pop()!;

      try {
        const attrs = await client.send(
          new GetQueueAttributesCommand({
            QueueUrl: queueUrl,
            AttributeNames: ['All'],
          })
        );
        const a = attrs.Attributes ?? {};

        resources.push({
          id: a.QueueArn ?? queueUrl,
          arn: a.QueueArn,
          type: 'sqs-queue',
          name,
          region,
          service: 'sqs',
          status: 'active',
          createdAt: a.CreatedTimestamp ? new Date(parseInt(a.CreatedTimestamp, 10) * 1000).toISOString() : undefined,
          lastModified: a.LastModifiedTimestamp ? new Date(parseInt(a.LastModifiedTimestamp, 10) * 1000).toISOString() : undefined,
          managed: false,
          metadata: {
            queueUrl,
            approximateMessages: parseInt(a.ApproximateNumberOfMessages ?? '0', 10),
            approximateMessagesNotVisible: parseInt(a.ApproximateNumberOfMessagesNotVisible ?? '0', 10),
            approximateMessagesDelayed: parseInt(a.ApproximateNumberOfMessagesDelayed ?? '0', 10),
            visibilityTimeout: parseInt(a.VisibilityTimeout ?? '30', 10),
            retentionPeriod: parseInt(a.MessageRetentionPeriod ?? '345600', 10),
            fifo: name.endsWith('.fifo'),
            dlqArn: a.RedrivePolicy ? JSON.parse(a.RedrivePolicy).deadLetterTargetArn : undefined,
          },
        });
      } catch {
        resources.push({
          id: queueUrl,
          type: 'sqs-queue',
          name,
          region,
          service: 'sqs',
          status: 'active',
          managed: false,
          metadata: { queueUrl },
        });
      }
    }

    nextToken = resp.NextToken;
  } while (nextToken);

  return resources;
}
