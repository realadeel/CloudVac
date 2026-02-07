import { DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';

export async function deleteDynamoDBTable(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.dynamodb(profile, resource.region as Region);
  const tableName = resource.name;
  await client.send(new DeleteTableCommand({ TableName: tableName }));
}
