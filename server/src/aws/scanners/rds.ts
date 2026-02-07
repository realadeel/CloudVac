import { DescribeDBInstancesCommand, DescribeDBClustersCommand } from '@aws-sdk/client-rds';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanRDS(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const client = clients.rds(profile, region);
  const resources: Resource[] = [];

  // DB Instances
  let marker: string | undefined;
  do {
    const resp = await client.send(new DescribeDBInstancesCommand({ Marker: marker }));
    for (const db of resp.DBInstances ?? []) {
      resources.push({
        id: db.DBInstanceIdentifier!,
        arn: db.DBInstanceArn,
        type: 'rds-instance',
        name: db.DBInstanceIdentifier!,
        region,
        service: 'rds',
        status: db.DBInstanceStatus ?? 'unknown',
        createdAt: db.InstanceCreateTime?.toISOString(),
        managed: false,
        metadata: {
          engine: db.Engine,
          engineVersion: db.EngineVersion,
          instanceClass: db.DBInstanceClass,
          allocatedStorage: db.AllocatedStorage,
          multiAZ: db.MultiAZ,
          storageType: db.StorageType,
          endpoint: db.Endpoint?.Address,
          port: db.Endpoint?.Port,
        },
      });
    }
    marker = resp.Marker;
  } while (marker);

  // DB Clusters (Aurora)
  let clusterMarker: string | undefined;
  do {
    const resp = await client.send(new DescribeDBClustersCommand({ Marker: clusterMarker }));
    for (const cluster of resp.DBClusters ?? []) {
      resources.push({
        id: cluster.DBClusterIdentifier!,
        arn: cluster.DBClusterArn,
        type: 'rds-cluster',
        name: cluster.DBClusterIdentifier!,
        region,
        service: 'rds',
        status: cluster.Status ?? 'unknown',
        createdAt: cluster.ClusterCreateTime?.toISOString(),
        managed: false,
        metadata: {
          engine: cluster.Engine,
          engineVersion: cluster.EngineVersion,
          members: cluster.DBClusterMembers?.map((m) => m.DBInstanceIdentifier),
          endpoint: cluster.Endpoint,
          readerEndpoint: cluster.ReaderEndpoint,
        },
      });
    }
    clusterMarker = resp.Marker;
  } while (clusterMarker);

  return resources;
}
