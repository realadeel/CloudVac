import { DeleteDBInstanceCommand, DeleteDBClusterCommand } from '@aws-sdk/client-rds';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';

export async function deleteRDSInstance(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.rds(profile, resource.region as Region);
  await client.send(
    new DeleteDBInstanceCommand({
      DBInstanceIdentifier: resource.id,
      SkipFinalSnapshot: true,
      DeleteAutomatedBackups: true,
    })
  );
}

export async function deleteRDSCluster(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.rds(profile, resource.region as Region);
  await client.send(
    new DeleteDBClusterCommand({
      DBClusterIdentifier: resource.id,
      SkipFinalSnapshot: true,
    })
  );
}
