import type { Resource } from '../../../shared/types.js';

export function deduplicateResources(resources: Resource[]): Resource[] {
  const seen = new Set<string>();
  return resources.filter((r) => {
    const key = `${r.id}::${r.region}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Detect orphaned CloudWatch log groups by matching log group name prefixes
 * to known resources. A log group is orphaned when:
 * - /aws/lambda/<name> and no Lambda function with that name exists
 * - /aws/rds/<type>/<name> and no RDS instance/cluster with that name exists
 * - /aws/apigateway/<id> and no API Gateway with that id exists
 * - /aws/ecs/<name> (ECS not scanned, so flagged as potentially orphaned)
 */
export function findOrphanedLogGroups(resources: Resource[]) {
  const logGroups = resources.filter((r) => r.type === 'cloudwatch-log-group');

  // Build lookup sets for each service
  const lambdaNames = new Set<string>();
  const rdsNames = new Set<string>();
  const apiGatewayIds = new Set<string>();

  for (const r of resources) {
    switch (r.type) {
      case 'lambda-function':
        lambdaNames.add(r.name);
        break;
      case 'rds-instance':
      case 'rds-cluster':
        rdsNames.add(r.name);
        break;
      case 'apigateway-rest-api':
      case 'apigateway-http-api':
        rdsNames.add(r.name);
        // Also store the raw id (API Gateway IDs in log groups)
        apiGatewayIds.add(r.id);
        if (r.metadata?.id) apiGatewayIds.add(String(r.metadata.id));
        break;
    }
  }

  const orphaned: { resource: Resource; expectedResource: string; service: string }[] = [];

  for (const lg of logGroups) {
    const name = lg.name;

    // /aws/lambda/<function-name>
    const lambdaMatch = name.match(/^\/aws\/lambda\/(.+)$/);
    if (lambdaMatch) {
      const fnName = lambdaMatch[1];
      if (!lambdaNames.has(fnName)) {
        orphaned.push({ resource: lg, expectedResource: fnName, service: 'Lambda' });
      }
      continue;
    }

    // /aws/rds/<type>/<db-name> (e.g. /aws/rds/instance/mydb/error)
    const rdsMatch = name.match(/^\/aws\/rds\/(?:instance|cluster)\/([^/]+)/);
    if (rdsMatch) {
      const dbName = rdsMatch[1];
      if (!rdsNames.has(dbName)) {
        orphaned.push({ resource: lg, expectedResource: dbName, service: 'RDS' });
      }
      continue;
    }

    // /aws/apigateway/<api-id>
    const apigwMatch = name.match(/^\/aws\/(?:api-gateway|apigateway|api_gateway)\/(.+)$/);
    if (apigwMatch) {
      const apiId = apigwMatch[1];
      if (!apiGatewayIds.has(apiId)) {
        orphaned.push({ resource: lg, expectedResource: apiId, service: 'API Gateway' });
      }
      continue;
    }
  }

  return orphaned;
}
