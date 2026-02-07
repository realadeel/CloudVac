import { DeleteLoadBalancerCommand as DeleteALBCommand } from '@aws-sdk/client-elastic-load-balancing-v2';
import { DeleteLoadBalancerCommand as DeleteCLBCommand } from '@aws-sdk/client-elastic-load-balancing';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';

export async function deleteLoadBalancer(profile: AWSProfile, resource: Resource): Promise<void> {
  if (resource.type === 'clb') {
    const client = clients.elb(profile, resource.region as Region);
    await client.send(new DeleteCLBCommand({ LoadBalancerName: resource.id }));
  } else {
    const client = clients.elbv2(profile, resource.region as Region);
    await client.send(new DeleteALBCommand({ LoadBalancerArn: resource.id }));
  }
}
