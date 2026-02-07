import { EC2Client } from '@aws-sdk/client-ec2';
import { RDSClient } from '@aws-sdk/client-rds';
import { ElasticLoadBalancingV2Client } from '@aws-sdk/client-elastic-load-balancing-v2';
import { ElasticLoadBalancingClient } from '@aws-sdk/client-elastic-load-balancing';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import { STSClient } from '@aws-sdk/client-sts';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
import { APIGatewayClient } from '@aws-sdk/client-api-gateway';
import { ApiGatewayV2Client } from '@aws-sdk/client-apigatewayv2';
import type { AWSProfile } from '../../../shared/types.js';
import type { Region } from '../config.js';

const cache = new Map<string, unknown>();

function getCredentials(profile: AWSProfile) {
  return {
    accessKeyId: profile.accessKeyId,
    secretAccessKey: profile.secretAccessKey,
    ...(profile.sessionToken ? { sessionToken: profile.sessionToken } : {}),
  };
}

function getOrCreate<T>(key: string, factory: () => T): T {
  if (!cache.has(key)) {
    cache.set(key, factory());
  }
  return cache.get(key) as T;
}

export function ec2(profile: AWSProfile, region: Region) {
  return getOrCreate(`ec2:${profile.name}:${region}`, () => new EC2Client({ region, credentials: getCredentials(profile) }));
}

export function rds(profile: AWSProfile, region: Region) {
  return getOrCreate(`rds:${profile.name}:${region}`, () => new RDSClient({ region, credentials: getCredentials(profile) }));
}

export function elbv2(profile: AWSProfile, region: Region) {
  return getOrCreate(`elbv2:${profile.name}:${region}`, () => new ElasticLoadBalancingV2Client({ region, credentials: getCredentials(profile) }));
}

export function elb(profile: AWSProfile, region: Region) {
  return getOrCreate(`elb:${profile.name}:${region}`, () => new ElasticLoadBalancingClient({ region, credentials: getCredentials(profile) }));
}

export function lambda(profile: AWSProfile, region: Region) {
  return getOrCreate(`lambda:${profile.name}:${region}`, () => new LambdaClient({ region, credentials: getCredentials(profile) }));
}

export function s3(profile: AWSProfile, region: Region) {
  return getOrCreate(`s3:${profile.name}:${region}`, () => new S3Client({ region, credentials: getCredentials(profile) }));
}

export function dynamodb(profile: AWSProfile, region: Region) {
  return getOrCreate(`dynamodb:${profile.name}:${region}`, () => new DynamoDBClient({ region, credentials: getCredentials(profile) }));
}

export function cloudwatchLogs(profile: AWSProfile, region: Region) {
  return getOrCreate(`cwlogs:${profile.name}:${region}`, () => new CloudWatchLogsClient({ region, credentials: getCredentials(profile) }));
}

export function cloudwatch(profile: AWSProfile, region: Region) {
  return getOrCreate(`cw:${profile.name}:${region}`, () => new CloudWatchClient({ region, credentials: getCredentials(profile) }));
}

export function sns(profile: AWSProfile, region: Region) {
  return getOrCreate(`sns:${profile.name}:${region}`, () => new SNSClient({ region, credentials: getCredentials(profile) }));
}

export function sqs(profile: AWSProfile, region: Region) {
  return getOrCreate(`sqs:${profile.name}:${region}`, () => new SQSClient({ region, credentials: getCredentials(profile) }));
}

export function apigateway(profile: AWSProfile, region: Region) {
  return getOrCreate(`apigw:${profile.name}:${region}`, () => new APIGatewayClient({ region, credentials: getCredentials(profile) }));
}

export function apigatewayv2(profile: AWSProfile, region: Region) {
  return getOrCreate(`apigwv2:${profile.name}:${region}`, () => new ApiGatewayV2Client({ region, credentials: getCredentials(profile) }));
}

export function cloudformation(profile: AWSProfile, region: Region) {
  return getOrCreate(`cf:${profile.name}:${region}`, () => new CloudFormationClient({ region, credentials: getCredentials(profile) }));
}

export function costExplorer(profile: AWSProfile) {
  return getOrCreate(`ce:${profile.name}`, () => new CostExplorerClient({ region: 'us-east-1', credentials: getCredentials(profile) }));
}

export function sts(profile: AWSProfile) {
  return getOrCreate(`sts:${profile.name}`, () => new STSClient({ region: 'us-east-1', credentials: getCredentials(profile) }));
}

export function clearCache() {
  cache.clear();
}
