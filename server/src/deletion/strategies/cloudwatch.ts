import { DeleteLogGroupCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DeleteAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';

export async function deleteLogGroup(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.cloudwatchLogs(profile, resource.region as Region);
  await client.send(new DeleteLogGroupCommand({ logGroupName: resource.name }));
}

export async function deleteAlarm(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.cloudwatch(profile, resource.region as Region);
  await client.send(new DeleteAlarmsCommand({ AlarmNames: [resource.name] }));
}
