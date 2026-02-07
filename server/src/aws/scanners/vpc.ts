import {
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeSecurityGroupsCommand,
  DescribeInternetGatewaysCommand,
  DescribeRouteTablesCommand,
} from '@aws-sdk/client-ec2';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanVPC(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const client = clients.ec2(profile, region);
  const resources: Resource[] = [];

  // VPCs
  const vpcs = await client.send(new DescribeVpcsCommand({}));
  for (const vpc of vpcs.Vpcs ?? []) {
    const nameTag = vpc.Tags?.find((t) => t.Key === 'Name')?.Value;
    resources.push({
      id: vpc.VpcId!,
      type: 'vpc',
      name: nameTag ?? vpc.VpcId!,
      region,
      service: 'vpc',
      status: vpc.State ?? 'unknown',
      managed: false,
      metadata: {
        cidrBlock: vpc.CidrBlock,
        isDefault: vpc.IsDefault,
        dhcpOptionsId: vpc.DhcpOptionsId,
        tags: vpc.Tags?.reduce((acc, t) => ({ ...acc, [t.Key!]: t.Value }), {}),
      },
    });
  }

  // Subnets
  const subnets = await client.send(new DescribeSubnetsCommand({}));
  for (const subnet of subnets.Subnets ?? []) {
    const nameTag = subnet.Tags?.find((t) => t.Key === 'Name')?.Value;
    resources.push({
      id: subnet.SubnetId!,
      type: 'subnet',
      name: nameTag ?? subnet.SubnetId!,
      region,
      service: 'vpc',
      status: subnet.State ?? 'unknown',
      managed: false,
      metadata: {
        vpcId: subnet.VpcId,
        cidrBlock: subnet.CidrBlock,
        az: subnet.AvailabilityZone,
        availableIps: subnet.AvailableIpAddressCount,
        mapPublicIp: subnet.MapPublicIpOnLaunch,
        tags: subnet.Tags?.reduce((acc, t) => ({ ...acc, [t.Key!]: t.Value }), {}),
      },
    });
  }

  // Security Groups (exclude default SG)
  const sgs = await client.send(new DescribeSecurityGroupsCommand({}));
  for (const sg of sgs.SecurityGroups ?? []) {
    resources.push({
      id: sg.GroupId!,
      type: 'security-group',
      name: sg.GroupName ?? sg.GroupId!,
      region,
      service: 'vpc',
      status: 'active',
      managed: false,
      metadata: {
        vpcId: sg.VpcId,
        description: sg.Description,
        inboundRules: sg.IpPermissions?.length ?? 0,
        outboundRules: sg.IpPermissionsEgress?.length ?? 0,
        tags: sg.Tags?.reduce((acc, t) => ({ ...acc, [t.Key!]: t.Value }), {}),
      },
    });
  }

  // Internet Gateways
  const igws = await client.send(new DescribeInternetGatewaysCommand({}));
  for (const igw of igws.InternetGateways ?? []) {
    const nameTag = igw.Tags?.find((t) => t.Key === 'Name')?.Value;
    const attachedVpc = igw.Attachments?.[0]?.VpcId;
    resources.push({
      id: igw.InternetGatewayId!,
      type: 'internet-gateway',
      name: nameTag ?? igw.InternetGatewayId!,
      region,
      service: 'vpc',
      status: igw.Attachments?.[0]?.State ?? 'detached',
      managed: false,
      metadata: {
        attachedVpcId: attachedVpc,
        tags: igw.Tags?.reduce((acc, t) => ({ ...acc, [t.Key!]: t.Value }), {}),
      },
    });
  }

  // Route Tables
  const rts = await client.send(new DescribeRouteTablesCommand({}));
  for (const rt of rts.RouteTables ?? []) {
    const nameTag = rt.Tags?.find((t) => t.Key === 'Name')?.Value;
    const isMain = rt.Associations?.some((a) => a.Main) ?? false;
    resources.push({
      id: rt.RouteTableId!,
      type: 'route-table',
      name: nameTag ?? rt.RouteTableId!,
      region,
      service: 'vpc',
      status: isMain ? 'main' : 'active',
      managed: false,
      metadata: {
        vpcId: rt.VpcId,
        isMain,
        routeCount: rt.Routes?.length ?? 0,
        associationCount: rt.Associations?.length ?? 0,
        tags: rt.Tags?.reduce((acc, t) => ({ ...acc, [t.Key!]: t.Value }), {}),
      },
    });
  }

  return resources;
}
