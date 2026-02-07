import { useCallback, useRef } from 'react';
import { connectSSE } from '../api/sse';
import { fetchJSON } from '../api/client';
import { useProfileStore } from '../stores/profile-store';
import { useScanStore } from '../stores/scan-store';
import { useLogStore } from '../stores/log-store';

export function useScan() {
  const profile = useProfileStore((s) => s.selectedProfile);
  const { setStatus, addProgress, setOverallProgress, setResources, setTotalStacks, setError, reset } = useScanStore();
  const addLog = useLogStore((s) => s.addLog);
  const cleanupRef = useRef<(() => void) | null>(null);

  const startScan = useCallback(() => {
    if (!profile) return;

    reset();
    setStatus('scanning');
    addLog({ level: 'info', message: `Starting scan for profile "${profile}"...` });

    const cleanup = connectSSE(
      `/api/scan?profile=${encodeURIComponent(profile)}`,
      {
        phase: (data: any) => {
          if (data.phase === 'cloudformation' && data.status === 'completed') {
            setTotalStacks(data.stackCount);
            addLog({ level: 'success', message: `Found ${data.stackCount} CloudFormation stacks (${data.managedResourceCount} managed resources)` });
          } else if (data.phase === 'services' && data.status === 'started') {
            addLog({ level: 'info', message: 'Scanning services across all regions...' });
          }
        },
        stack_found: (data: any) => {
          addLog({ level: 'info', message: `Stack: ${data.stackName} (${data.resourceCount} resources)`, region: data.region, service: 'cloudformation' });
        },
        scanning: (data: any) => {
          addProgress({ service: data.service, region: data.region, status: 'scanning' });
          setOverallProgress(data.progress ?? 0);
        },
        service_complete: (data: any) => {
          addProgress({ service: data.service, region: data.region, status: 'complete', count: data.count });
          setOverallProgress(data.progress ?? 0);
          if (data.count > 0) {
            addLog({ level: 'info', message: `Found ${data.count} ${data.service} resource(s)`, region: data.region, service: data.service });
          }
        },
        service_error: (data: any) => {
          addProgress({ service: data.service, region: data.region, status: 'error', error: data.error });
          addLog({ level: 'error', message: `Error scanning ${data.service}: ${data.error}`, region: data.region, service: data.service });
        },
        scan_complete: (data: any) => {
          setStatus('complete');
          addLog({
            level: 'success',
            message: `Scan complete: ${data.totalResources} resources (${data.managed} managed, ${data.loose} loose, ${data.stacks} stacks)`,
          });
          // Fetch the full resource list
          fetchJSON(`/resources?profile=${encodeURIComponent(profile)}`)
            .then((resp: any) => setResources(resp.resources))
            .catch(() => {});
        },
        error: (data: any) => {
          setStatus('error');
          setError(data.message);
          addLog({ level: 'error', message: `Scan failed: ${data.message}` });
        },
      },
      () => {
        // Only set error if we haven't completed
        const status = useScanStore.getState().status;
        if (status === 'scanning') {
          setStatus('error');
          setError('Connection lost');
        }
      }
    );

    cleanupRef.current = cleanup;
    return cleanup;
  }, [profile, reset, setStatus, addProgress, setOverallProgress, setResources, setTotalStacks, setError, addLog]);

  const stopScan = useCallback(() => {
    cleanupRef.current?.();
    setStatus('idle');
  }, [setStatus]);

  return { startScan, stopScan };
}
