import { DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import type { AWSProfile, Resource } from '../../../../shared/types.js';
import type { Region } from '../../config.js';
import * as clients from '../clients.js';

export async function scanCloudWatch(profile: AWSProfile, region: Region): Promise<Resource[]> {
  const resources: Resource[] = [];

  // CloudWatch Log Groups
  const logsClient = clients.cloudwatchLogs(profile, region);
  let nextToken: string | undefined;

  do {
    const resp = await logsClient.send(new DescribeLogGroupsCommand({ nextToken }));

    for (const lg of resp.logGroups ?? []) {
      resources.push({
        id: lg.arn ?? lg.logGroupName!,
        arn: lg.arn,
        type: 'cloudwatch-log-group',
        name: lg.logGroupName!,
        region,
        service: 'cloudwatch',
        status: 'active',
        createdAt: lg.creationTime ? new Date(lg.creationTime).toISOString() : undefined,
        managed: false,
        metadata: {
          storedBytes: lg.storedBytes,
          retentionDays: lg.retentionInDays ?? 'Never expire',
          metricFilterCount: lg.metricFilterCount,
          kmsKeyId: lg.kmsKeyId,
        },
      });
    }

    nextToken = resp.nextToken;
  } while (nextToken);

  // CloudWatch Alarms
  const cwClient = clients.cloudwatch(profile, region);
  let alarmNextToken: string | undefined;

  do {
    const resp = await cwClient.send(new DescribeAlarmsCommand({ NextToken: alarmNextToken, MaxRecords: 100 }));

    for (const alarm of resp.MetricAlarms ?? []) {
      resources.push({
        id: alarm.AlarmArn ?? alarm.AlarmName!,
        arn: alarm.AlarmArn,
        type: 'cloudwatch-alarm',
        name: alarm.AlarmName!,
        region,
        service: 'cloudwatch',
        status: alarm.StateValue ?? 'unknown',
        createdAt: alarm.AlarmConfigurationUpdatedTimestamp?.toISOString(),
        managed: false,
        metadata: {
          namespace: alarm.Namespace,
          metricName: alarm.MetricName,
          comparisonOperator: alarm.ComparisonOperator,
          threshold: alarm.Threshold,
          period: alarm.Period,
          evaluationPeriods: alarm.EvaluationPeriods,
          actionsEnabled: alarm.ActionsEnabled,
          alarmActions: alarm.AlarmActions,
        },
      });
    }

    alarmNextToken = resp.NextToken;
  } while (alarmNextToken);

  return resources;
}
