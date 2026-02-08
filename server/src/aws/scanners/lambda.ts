import { ListFunctionsCommand } from '@aws-sdk/client-lambda';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanLambda(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const client = clients.lambda(profile, region);
  const resources: Resource[] = [];
  let marker: string | undefined;

  do {
    const resp = await client.send(new ListFunctionsCommand({ Marker: marker }));

    for (const fn of resp.Functions ?? []) {
      resources.push({
        id: fn.FunctionArn!,
        arn: fn.FunctionArn,
        type: 'lambda-function',
        name: fn.FunctionName!,
        region,
        service: 'lambda',
        status: fn.State ?? 'Active',
        lastModified: fn.LastModified,
        managed: false,
        metadata: {
          runtime: fn.Runtime,
          handler: fn.Handler,
          memorySize: fn.MemorySize,
          timeout: fn.Timeout,
          codeSize: fn.CodeSize,
          description: fn.Description,
          lastModified: fn.LastModified,
        },
      });
    }

    marker = resp.NextMarker;
  } while (marker);

  return resources;
}
