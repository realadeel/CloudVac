import { GetRestApisCommand } from '@aws-sdk/client-api-gateway';
import { GetApisCommand } from '@aws-sdk/client-apigatewayv2';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanAPIGateway(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const resources: Resource[] = [];

  // REST APIs (API Gateway v1)
  const restClient = clients.apigateway(profile, region);
  let position: string | undefined;

  do {
    const resp = await restClient.send(new GetRestApisCommand({ position, limit: 100 }));

    for (const api of resp.items ?? []) {
      resources.push({
        id: api.id!,
        type: 'apigateway-rest-api',
        name: api.name ?? api.id!,
        region,
        service: 'apigateway',
        status: 'active',
        createdAt: api.createdDate?.toISOString(),
        managed: false,
        metadata: {
          description: api.description,
          apiKeySource: api.apiKeySource,
          endpointType: api.endpointConfiguration?.types?.[0],
          version: api.version,
          apiType: 'REST',
        },
      });
    }

    position = resp.position;
  } while (position);

  // HTTP/WebSocket APIs (API Gateway v2)
  const v2Client = clients.apigatewayv2(profile, region);
  let nextToken: string | undefined;

  do {
    const resp = await v2Client.send(new GetApisCommand({ NextToken: nextToken, MaxResults: '100' }));

    for (const api of resp.Items ?? []) {
      resources.push({
        id: api.ApiId!,
        type: 'apigateway-http-api',
        name: api.Name ?? api.ApiId!,
        region,
        service: 'apigateway',
        status: 'active',
        createdAt: api.CreatedDate?.toISOString(),
        managed: false,
        metadata: {
          description: api.Description,
          protocolType: api.ProtocolType,
          apiEndpoint: api.ApiEndpoint,
          apiType: api.ProtocolType === 'WEBSOCKET' ? 'WebSocket' : 'HTTP',
        },
      });
    }

    nextToken = resp.NextToken;
  } while (nextToken);

  return resources;
}
