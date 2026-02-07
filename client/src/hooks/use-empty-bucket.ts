import { useCallback, useRef, useState } from 'react';
import { connectPostSSE } from '../api/sse';
import { useProfileStore } from '../stores/profile-store';
import { useLogStore } from '../stores/log-store';

export type EmptyBucketStatus = 'idle' | 'emptying' | 'complete' | 'error';

export function useEmptyBucket() {
  const profile = useProfileStore((s) => s.selectedProfile);
  const addLog = useLogStore((s) => s.addLog);
  const cleanupRef = useRef<(() => void) | null>(null);

  const [status, setStatus] = useState<EmptyBucketStatus>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const emptyBucket = useCallback(
    (resourceId: string, bucketName: string) => {
      if (!profile) return;

      setStatus('emptying');
      setMessage('Starting...');
      setError(null);
      addLog({ level: 'info', message: `Emptying bucket "${bucketName}"...`, service: 's3' });

      const cleanup = connectPostSSE(
        '/api/empty-bucket',
        { profile, resourceId },
        {
          progress: (data: any) => {
            setMessage(data.message);
          },
          complete: (data: any) => {
            setStatus('complete');
            setMessage(data.message);
            addLog({ level: 'success', message: data.message, service: 's3' });
          },
          error: (data: any) => {
            setStatus('error');
            setError(data.message);
            setMessage('');
            addLog({ level: 'error', message: `Failed to empty bucket "${bucketName}": ${data.message}`, service: 's3' });
          },
        },
        (err) => {
          setStatus('error');
          setError((err as Error).message ?? 'Connection lost');
          setMessage('');
          addLog({ level: 'error', message: `Empty bucket connection error: ${(err as Error).message}` });
        }
      );

      cleanupRef.current = cleanup;
    },
    [profile, addLog]
  );

  const resetEmpty = useCallback(() => {
    cleanupRef.current?.();
    setStatus('idle');
    setMessage('');
    setError(null);
  }, []);

  return { status, message, error, emptyBucket, resetEmpty };
}
