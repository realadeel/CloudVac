import { DescribeLoadBalancersCommand as DescribeALBCommand } from '@aws-sdk/client-elastic-load-balancing-v2';
import { DescribeLoadBalancersCommand as DescribeCLBCommand } from '@aws-sdk/client-elastic-load-balancing';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanELB(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const resources: Resource[] = [];

  // ALB / NLB (v2)
  const v2Client = clients.elbv2(profile, region);
  let marker: string | undefined;
  do {
    const resp = await v2Client.send(new DescribeALBCommand({ Marker: marker }));
    for (const lb of resp.LoadBalancers ?? []) {
      const lbType = lb.Type === 'network' ? 'nlb' : 'alb';
      resources.push({
        id: lb.LoadBalancerArn!,
        arn: lb.LoadBalancerArn,
        type: lbType,
        name: lb.LoadBalancerName!,
        region,
        service: 'elb',
        status: lb.State?.Code ?? 'unknown',
        createdAt: lb.CreatedTime?.toISOString(),
        managed: false,
        metadata: {
          type: lb.Type,
          scheme: lb.Scheme,
          dnsName: lb.DNSName,
          vpcId: lb.VpcId,
          azs: lb.AvailabilityZones?.map((az) => az.ZoneName),
        },
      });
    }
    marker = resp.NextMarker;
  } while (marker);

  // Classic LB
  const v1Client = clients.elb(profile, region);
  let clbMarker: string | undefined;
  do {
    const resp = await v1Client.send(new DescribeCLBCommand({ Marker: clbMarker }));
    for (const lb of resp.LoadBalancerDescriptions ?? []) {
      resources.push({
        id: lb.LoadBalancerName!,
        type: 'clb',
        name: lb.LoadBalancerName!,
        region,
        service: 'elb',
        status: 'active',
        createdAt: lb.CreatedTime?.toISOString(),
        managed: false,
        metadata: {
          dnsName: lb.DNSName,
          vpcId: lb.VPCId,
          instances: lb.Instances?.map((i) => i.InstanceId),
          azs: lb.AvailabilityZones,
        },
      });
    }
    clbMarker = resp.NextMarker;
  } while (clbMarker);

  return resources;
}
