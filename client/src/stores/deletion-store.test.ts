import { describe, it, expect, beforeEach } from 'vitest';
import { useDeletionStore } from './deletion-store';

const { getState } = useDeletionStore;

function makeStep(id: string, status: 'pending' | 'deleting' | 'deleted' | 'failed') {
  return { step: 1, id, name: id, type: 'lambda-function', region: 'us-east-1', action: 'delete', status };
}

describe('deletion store – queue management', () => {
  beforeEach(() => {
    // Reset store to initial state
    useDeletionStore.setState({
      queue: [],
      dryRun: true,
      jobId: null,
      status: 'idle',
      steps: [],
      warnings: [],
      progress: 0,
      error: null,
    });
  });

  it('starts with empty queue', () => {
    expect(getState().queue).toEqual([]);
  });

  it('addToQueue adds IDs', () => {
    getState().addToQueue(['a', 'b', 'c']);
    expect(getState().queue).toEqual(['a', 'b', 'c']);
  });

  it('addToQueue deduplicates IDs', () => {
    getState().addToQueue(['a', 'b']);
    getState().addToQueue(['b', 'c']);
    expect(getState().queue).toEqual(['a', 'b', 'c']);
  });

  it('removeFromQueue removes a single ID', () => {
    getState().addToQueue(['a', 'b', 'c']);
    getState().removeFromQueue('b');
    expect(getState().queue).toEqual(['a', 'c']);
  });

  it('removeFromQueue does nothing for unknown ID', () => {
    getState().addToQueue(['a', 'b']);
    getState().removeFromQueue('z');
    expect(getState().queue).toEqual(['a', 'b']);
  });

  it('removeMultipleFromQueue removes multiple IDs', () => {
    getState().addToQueue(['a', 'b', 'c', 'd']);
    getState().removeMultipleFromQueue(['b', 'd']);
    expect(getState().queue).toEqual(['a', 'c']);
  });

  it('clearQueue empties the queue', () => {
    getState().addToQueue(['a', 'b', 'c']);
    getState().clearQueue();
    expect(getState().queue).toEqual([]);
  });

  it('queue count reflects additions and removals', () => {
    expect(getState().queue.length).toBe(0);
    getState().addToQueue(['a', 'b', 'c']);
    expect(getState().queue.length).toBe(3);
    getState().removeFromQueue('a');
    expect(getState().queue.length).toBe(2);
    getState().removeFromQueue('b');
    expect(getState().queue.length).toBe(1);
    getState().removeFromQueue('c');
    expect(getState().queue.length).toBe(0);
  });
});

describe('deletion store – retryFailed', () => {
  beforeEach(() => {
    useDeletionStore.setState({
      queue: [],
      dryRun: true,
      jobId: null,
      status: 'idle',
      steps: [],
      warnings: [],
      progress: 0,
      error: null,
    });
  });

  it('replaces queue with only failed step IDs', () => {
    getState().addToQueue(['a', 'b', 'c', 'd']);
    useDeletionStore.setState({
      status: 'complete',
      steps: [
        makeStep('a', 'deleted'),
        makeStep('b', 'failed'),
        makeStep('c', 'deleted'),
        makeStep('d', 'failed'),
      ],
    });
    getState().retryFailed();
    expect(getState().queue).toEqual(['b', 'd']);
  });

  it('results in empty queue when no steps failed', () => {
    getState().addToQueue(['a', 'b']);
    useDeletionStore.setState({
      status: 'complete',
      steps: [
        makeStep('a', 'deleted'),
        makeStep('b', 'deleted'),
      ],
    });
    getState().retryFailed();
    expect(getState().queue).toEqual([]);
  });

  it('resets job state on retry', () => {
    useDeletionStore.setState({
      jobId: 'job-123',
      status: 'complete',
      steps: [makeStep('a', 'failed')],
      warnings: ['some warning'],
      progress: 100,
      error: 'some error',
    });
    getState().retryFailed();
    expect(getState().jobId).toBeNull();
    expect(getState().status).toBe('idle');
    expect(getState().steps).toEqual([]);
    expect(getState().warnings).toEqual([]);
    expect(getState().progress).toBe(0);
    expect(getState().error).toBeNull();
  });
});

describe('deletion store – queue stays in sync during deletion lifecycle', () => {
  beforeEach(() => {
    useDeletionStore.setState({
      queue: [],
      dryRun: true,
      jobId: null,
      status: 'idle',
      steps: [],
      warnings: [],
      progress: 0,
      error: null,
    });
  });

  it('removing items during execution decrements queue count', () => {
    // Simulate: 3 items queued, deletion starts, items removed as deleted
    getState().addToQueue(['r1', 'r2', 'r3']);
    expect(getState().queue.length).toBe(3);

    getState().setStatus('executing');

    // Simulate SSE deleted events removing from queue one by one
    getState().removeFromQueue('r1');
    expect(getState().queue.length).toBe(2);

    getState().removeFromQueue('r2');
    expect(getState().queue.length).toBe(1);

    getState().removeFromQueue('r3');
    expect(getState().queue.length).toBe(0);
  });

  it('failed items stay in queue after partial deletion', () => {
    getState().addToQueue(['r1', 'r2', 'r3']);

    // r1 deleted successfully - removed from queue
    getState().removeFromQueue('r1');
    // r2 failed - stays in queue
    // r3 deleted successfully - removed from queue
    getState().removeFromQueue('r3');

    expect(getState().queue).toEqual(['r2']);
    expect(getState().queue.length).toBe(1);
  });

  it('reset removes successfully deleted items from queue', () => {
    getState().addToQueue(['a', 'b', 'c']);
    useDeletionStore.setState({
      status: 'complete',
      jobId: 'j1',
      steps: [
        makeStep('a', 'deleted'),
        makeStep('b', 'failed'),
        makeStep('c', 'deleted'),
      ],
    });
    getState().reset();
    // Only failed items remain in queue
    expect(getState().queue).toEqual(['b']);
    expect(getState().status).toBe('idle');
    expect(getState().jobId).toBeNull();
    expect(getState().steps).toEqual([]);
  });

  it('reset keeps full queue when no steps exist', () => {
    getState().addToQueue(['a', 'b']);
    useDeletionStore.setState({ status: 'complete', jobId: 'j1', steps: [] });
    getState().reset();
    // No steps = nothing to remove
    expect(getState().queue).toEqual(['a', 'b']);
    expect(getState().status).toBe('idle');
  });
});
