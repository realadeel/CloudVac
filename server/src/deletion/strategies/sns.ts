import { DeleteTopicCommand } from '@aws-sdk/client-sns';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';

export async function deleteSNSTopic(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.sns(profile, resource.region as Region);
  await client.send(new DeleteTopicCommand({ TopicArn: resource.arn ?? resource.id }));
}
