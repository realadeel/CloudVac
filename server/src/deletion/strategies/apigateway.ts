import { DeleteRestApiCommand } from '@aws-sdk/client-api-gateway';
import { DeleteApiCommand } from '@aws-sdk/client-apigatewayv2';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';

export async function deleteRestApi(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.apigateway(profile, resource.region as Region);
  await client.send(new DeleteRestApiCommand({ restApiId: resource.id }));
}

export async function deleteHttpApi(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.apigatewayv2(profile, resource.region as Region);
  await client.send(new DeleteApiCommand({ ApiId: resource.id }));
}
