import {
  DeleteVpcCommand,
  DeleteSubnetCommand,
  DeleteSecurityGroupCommand,
  DetachInternetGatewayCommand,
  DeleteInternetGatewayCommand,
  DeleteRouteTableCommand,
} from '@aws-sdk/client-ec2';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../../aws/clients.js';

export async function deleteVpc(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.ec2(profile, resource.region as Region);
  await client.send(new DeleteVpcCommand({ VpcId: resource.id }));
}

export async function deleteSubnet(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.ec2(profile, resource.region as Region);
  await client.send(new DeleteSubnetCommand({ SubnetId: resource.id }));
}

export async function deleteSecurityGroup(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.ec2(profile, resource.region as Region);
  await client.send(new DeleteSecurityGroupCommand({ GroupId: resource.id }));
}

export async function deleteInternetGateway(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.ec2(profile, resource.region as Region);
  const attachedVpcId = resource.metadata.attachedVpcId as string | undefined;
  if (attachedVpcId) {
    await client.send(new DetachInternetGatewayCommand({ InternetGatewayId: resource.id, VpcId: attachedVpcId }));
  }
  await client.send(new DeleteInternetGatewayCommand({ InternetGatewayId: resource.id }));
}

export async function deleteRouteTable(profile: AWSProfile, resource: Resource): Promise<void> {
  const client = clients.ec2(profile, resource.region as Region);
  await client.send(new DeleteRouteTableCommand({ RouteTableId: resource.id }));
}
