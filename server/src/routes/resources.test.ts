import { describe, it, expect } from 'vitest';
import { deduplicateResources } from './resources.js';
import type { Resource } from '../../../shared/types.js';

function makeResource(overrides: Partial<Resource> & { type: Resource['type'] }): Resource {
  const { type, ...rest } = overrides;
  return {
    id: 'test-id',
    type,
    name: 'test-resource',
    region: 'us-east-1',
    service: 'ec2' as any,
    status: 'active',
    managed: false,
    metadata: {},
    ...rest,
  };
}

describe('deduplicateResources', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicateResources([])).toEqual([]);
  });

  it('returns same array when no duplicates', () => {
    const resources = [
      makeResource({ id: 'a', type: 'ec2-instance', region: 'us-east-1' }),
      makeResource({ id: 'b', type: 'ec2-instance', region: 'us-east-1' }),
      makeResource({ id: 'c', type: 'ec2-instance', region: 'us-east-1' }),
    ];
    expect(deduplicateResources(resources)).toHaveLength(3);
  });

  it('removes resources with same id and same region', () => {
    const resources = [
      makeResource({ id: 'lambda-fn', type: 'lambda-function', region: 'us-east-1', name: 'my-fn' }),
      makeResource({ id: 'lambda-fn', type: 'lambda-function', region: 'us-east-1', name: 'my-fn' }),
    ];
    const result = deduplicateResources(resources);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('lambda-fn');
  });

  it('keeps resources with same id but different regions', () => {
    const resources = [
      makeResource({ id: 'arn:aws:lambda:us-east-1:123:function:my-fn', type: 'lambda-function', region: 'us-east-1' }),
      makeResource({ id: 'arn:aws:lambda:us-east-2:123:function:my-fn', type: 'lambda-function', region: 'us-east-2' }),
    ];
    const result = deduplicateResources(resources);
    expect(result).toHaveLength(2);
  });

  it('keeps first occurrence when duplicates exist', () => {
    const resources = [
      makeResource({ id: 'dupe', type: 'lambda-function', region: 'us-east-1', name: 'first' }),
      makeResource({ id: 'dupe', type: 'lambda-function', region: 'us-east-1', name: 'second' }),
    ];
    const result = deduplicateResources(resources);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('first');
  });

  it('handles multiple duplicate groups', () => {
    const resources = [
      makeResource({ id: 'fn-a', type: 'lambda-function', region: 'us-east-1' }),
      makeResource({ id: 'fn-b', type: 'lambda-function', region: 'us-east-1' }),
      makeResource({ id: 'fn-a', type: 'lambda-function', region: 'us-east-1' }),
      makeResource({ id: 'fn-b', type: 'lambda-function', region: 'us-east-1' }),
      makeResource({ id: 'fn-c', type: 'lambda-function', region: 'us-east-1' }),
    ];
    const result = deduplicateResources(resources);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).toEqual(['fn-a', 'fn-b', 'fn-c']);
  });

  it('deduplicates across different service types with same id', () => {
    const resources = [
      makeResource({ id: 'shared-id', type: 'ec2-instance', region: 'us-east-1', service: 'ec2' as any }),
      makeResource({ id: 'shared-id', type: 'ec2-instance', region: 'us-east-1', service: 'ec2' as any }),
    ];
    const result = deduplicateResources(resources);
    expect(result).toHaveLength(1);
  });

  it('handles large arrays without issues', () => {
    const resources = Array.from({ length: 1000 }, (_, i) =>
      makeResource({ id: `resource-${i % 500}`, type: 'ec2-instance', region: 'us-east-1' })
    );
    const result = deduplicateResources(resources);
    expect(result).toHaveLength(500);
  });

  it('preserves order of first occurrences', () => {
    const resources = [
      makeResource({ id: 'c', type: 'lambda-function', region: 'us-east-1' }),
      makeResource({ id: 'a', type: 'lambda-function', region: 'us-east-1' }),
      makeResource({ id: 'b', type: 'lambda-function', region: 'us-east-1' }),
      makeResource({ id: 'a', type: 'lambda-function', region: 'us-east-1' }),
      makeResource({ id: 'c', type: 'lambda-function', region: 'us-east-1' }),
    ];
    const result = deduplicateResources(resources);
    expect(result.map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });
});
