import { DeleteFunctionCommand } from '@aws-sdk/client-lambda';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';

export async function deleteLambdaFunction(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.lambda(profile, resource.region as Region);
  await client.send(new DeleteFunctionCommand({ FunctionName: resource.id }));
}
