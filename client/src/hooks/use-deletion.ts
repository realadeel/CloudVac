import { useCallback } from 'react';
import { postJSON } from '../api/client';
import { connectSSE } from '../api/sse';
import { useProfileStore } from '../stores/profile-store';
import { useDeletionStore } from '../stores/deletion-store';
import { useLogStore } from '../stores/log-store';

export function useDeletion() {
  const profile = useProfileStore((s) => s.selectedProfile);
  const { queue, dryRun, setJobId, setStatus, setSteps, updateStep, setWarnings, setProgress, setError } = useDeletionStore();
  const addLog = useLogStore((s) => s.addLog);

  const executeDeletion = useCallback(async () => {
    if (!profile || queue.length === 0) return;

    setStatus('planning');
    addLog({ level: 'info', message: `${dryRun ? '[DRY RUN] ' : ''}Starting deletion of ${queue.length} resource(s)...` });

    try {
      const { jobId } = await postJSON<{ jobId: string }>('/delete', {
        profile,
        resourceIds: queue,
        dryRun,
      });

      setJobId(jobId);
      setStatus(dryRun ? 'previewing' : 'executing');

      connectSSE(`/api/delete/${jobId}`, {
        plan: (data: any) => {
          setSteps(
            data.steps.map((s: any) => ({ ...s, status: 'pending' }))
          );
          setWarnings(data.warnings ?? []);
          if (data.warnings?.length) {
            for (const w of data.warnings) {
              addLog({ level: 'warn', message: w });
            }
          }
        },
        dry_run_complete: (data: any) => {
          setStatus('complete');
          addLog({ level: 'success', message: `Dry run complete: would delete ${data.wouldDelete} resource(s)` });
        },
        deleting: (data: any) => {
          updateStep(data.id, { status: 'deleting' });
          addLog({ level: 'info', message: `Deleting: ${data.name} (${data.action})`, region: data.region });
        },
        deleted: (data: any) => {
          updateStep(data.id, { status: 'deleted', duration: data.duration });
          setProgress(data.progress ?? 0);
          addLog({ level: 'success', message: `Deleted: ${data.name} (${data.duration}ms)` });
        },
        delete_failed: (data: any) => {
          updateStep(data.id, { status: 'failed', error: data.error });
          setProgress(data.progress ?? 0);
          addLog({ level: 'error', message: `Failed to delete ${data.name}: ${data.error}` });
        },
        progress: (data: any) => {
          addLog({ level: 'info', message: data.message });
        },
        complete: (data: any) => {
          setStatus('complete');
          addLog({ level: 'success', message: `Deletion complete: ${data.deleted}/${data.total} deleted` });
        },
        error: (data: any) => {
          setStatus('error');
          setError(data.message);
          addLog({ level: 'error', message: `Deletion error: ${data.message}` });
        },
      });
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
      addLog({ level: 'error', message: `Failed to start deletion: ${(err as Error).message}` });
    }
  }, [profile, queue, dryRun, setJobId, setStatus, setSteps, updateStep, setWarnings, setProgress, setError, addLog]);

  return { executeDeletion };
}
