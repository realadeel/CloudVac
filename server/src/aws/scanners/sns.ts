import { ListTopicsCommand, GetTopicAttributesCommand } from '@aws-sdk/client-sns';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanSNS(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const client = clients.sns(profile, region);
  const resources: Resource[] = [];
  let nextToken: string | undefined;

  do {
    const resp = await client.send(new ListTopicsCommand({ NextToken: nextToken }));

    for (const topic of resp.Topics ?? []) {
      const arn = topic.TopicArn!;
      const name = arn.split(':').pop()!;

      try {
        const attrs = await client.send(new GetTopicAttributesCommand({ TopicArn: arn }));
        const a = attrs.Attributes ?? {};

        resources.push({
          id: arn,
          arn,
          type: 'sns-topic',
          name,
          region,
          service: 'sns',
          status: 'active',
          managed: false,
          metadata: {
            subscriptionCount: parseInt(a.SubscriptionsConfirmed ?? '0', 10),
            subscriptionsPending: parseInt(a.SubscriptionsPending ?? '0', 10),
            displayName: a.DisplayName,
            kmsKeyId: a.KmsMasterKeyId,
            fifo: name.endsWith('.fifo'),
          },
        });
      } catch {
        resources.push({
          id: arn,
          arn,
          type: 'sns-topic',
          name,
          region,
          service: 'sns',
          status: 'active',
          managed: false,
          metadata: {},
        });
      }
    }

    nextToken = resp.NextToken;
  } while (nextToken);

  return resources;
}
