import { ListTablesCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanDynamoDB(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const client = clients.dynamodb(profile, region);
  const resources: Resource[] = [];
  let lastEvaluatedTableName: string | undefined;

  do {
    const resp = await client.send(
      new ListTablesCommand({ ExclusiveStartTableName: lastEvaluatedTableName, Limit: 100 })
    );

    for (const tableName of resp.TableNames ?? []) {
      try {
        const detail = await client.send(new DescribeTableCommand({ TableName: tableName }));
        const table = detail.Table!;

        resources.push({
          id: table.TableArn ?? tableName,
          arn: table.TableArn,
          type: 'dynamodb-table',
          name: tableName,
          region,
          service: 'dynamodb',
          status: table.TableStatus ?? 'unknown',
          createdAt: table.CreationDateTime?.toISOString(),
          managed: false,
          metadata: {
            itemCount: table.ItemCount,
            sizeBytes: table.TableSizeBytes,
            billingMode: table.BillingModeSummary?.BillingMode ?? 'PROVISIONED',
            readCapacity: table.ProvisionedThroughput?.ReadCapacityUnits,
            writeCapacity: table.ProvisionedThroughput?.WriteCapacityUnits,
            gsiCount: table.GlobalSecondaryIndexes?.length ?? 0,
            lsiCount: table.LocalSecondaryIndexes?.length ?? 0,
            streamEnabled: table.StreamSpecification?.StreamEnabled ?? false,
            tags: {},
          },
        });
      } catch {
        // Skip tables we can't describe (permission issues)
      }
    }

    lastEvaluatedTableName = resp.LastEvaluatedTableName;
  } while (lastEvaluatedTableName);

  return resources;
}
