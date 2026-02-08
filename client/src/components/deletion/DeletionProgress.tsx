import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Clock, AlertTriangle, Trash2, RotateCcw } from 'lucide-react';
import { useDeletionStore } from '../../stores/deletion-store';
import { ProgressBar } from '../shared/ProgressBar';
import { Badge } from '../shared/Badge';
import { useEmptyBucket } from '../../hooks/use-empty-bucket';

/** Types that may fail because of non-empty S3 buckets */
const S3_RELATED_TYPES = new Set(['s3-bucket', 'cloudformation-stack']);

export function DeletionProgress() {
  const { status, steps, warnings, progress, dryRun, reset, retryFailed } = useDeletionStore();
  const { status: emptyStatus, message: emptyMsg, error: emptyErr, emptyBucket, resetEmpty } = useEmptyBucket();
  const [emptyingStepId, setEmptyingStepId] = useState<string | null>(null);

  const failedSteps = steps.filter((s) => s.status === 'failed');
  const hasFailedS3 = failedSteps.some((s) => S3_RELATED_TYPES.has(s.type));

  const handleEmptyBucket = (stepId: string, name: string) => {
    setEmptyingStepId(stepId);
    emptyBucket(stepId, name);
  };

  const handleDismissEmpty = () => {
    setEmptyingStepId(null);
    resetEmpty();
  };

  const statusIcon = {
    pending: <Clock size={16} className="text-text-muted" />,
    deleting: <Loader2 size={16} className="text-accent animate-spin" />,
    deleted: <CheckCircle2 size={16} className="text-success" />,
    failed: <XCircle size={16} className="text-danger" />,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {dryRun ? 'Deletion Preview (Dry Run)' : 'Deletion Progress'}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {status === 'complete'
              ? dryRun
                ? 'Preview complete. No resources were deleted.'
                : `Deletion complete. ${steps.filter((s) => s.status === 'deleted').length}/${steps.length} succeeded.`
              : `${steps.filter((s) => s.status === 'deleted').length}/${steps.length} completed`}
          </p>
        </div>
        {status === 'complete' && (
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            Done
          </button>
        )}
      </div>

      {!dryRun && status !== 'complete' && (
        <ProgressBar value={progress} />
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-warning font-medium text-sm">
            <AlertTriangle size={16} />
            Warnings
          </div>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-text-secondary pl-6">{w}</p>
          ))}
        </div>
      )}

      {/* Empty bucket progress banner */}
      {emptyingStepId && emptyStatus === 'emptying' && (
        <EmptyBanner variant="progress" message={emptyMsg} />
      )}
      {emptyingStepId && emptyStatus === 'complete' && (
        <EmptyBanner variant="success" message={emptyMsg} onDismiss={handleDismissEmpty} />
      )}
      {emptyingStepId && emptyStatus === 'error' && (
        <EmptyBanner
          variant="error"
          message={emptyErr ?? 'Unknown error'}
          onDismiss={handleDismissEmpty}
          onRetry={() => {
            const step = steps.find((s) => s.id === emptyingStepId);
            if (step) handleEmptyBucket(step.id, step.name);
          }}
        />
      )}

      {/* Failed steps summary with action buttons */}
      {status === 'complete' && !dryRun && failedSteps.length > 0 && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-danger font-medium text-sm">
            <XCircle size={16} />
            {failedSteps.length} resource{failedSteps.length > 1 ? 's' : ''} failed to delete
          </div>
          {hasFailedS3 && (
            <p className="text-xs text-text-secondary pl-6">
              Some failures may be due to non-empty S3 buckets. Use the <strong>Empty Bucket</strong> action below to clear contents, then retry deletion.
            </p>
          )}
          <div className="flex gap-2 pl-6">
            <button
              onClick={retryFailed}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
            >
              <RotateCcw size={13} />
              Retry {failedSteps.length} Failed
            </button>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center px-4 py-3 border-b border-border/50">
            <div className="w-8 text-center mr-2">
              {statusIcon[step.status]}
            </div>
            <div className="w-8 text-xs text-text-muted text-center mr-3">#{step.step}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{step.name}</span>
                <Badge label={step.type} />
              </div>
              <p className="text-xs text-text-muted mt-0.5">{step.action} in {step.region}</p>
              {step.error && <p className="text-xs text-danger mt-1">{step.error}</p>}

              {/* Per-step actions for failed S3-related steps */}
              {step.status === 'failed' && S3_RELATED_TYPES.has(step.type) && status === 'complete' && (
                <div className="flex gap-2 mt-2">
                  {step.type === 's3-bucket' && (
                    <button
                      onClick={() => handleEmptyBucket(step.id, step.name)}
                      disabled={emptyStatus === 'emptying'}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-warning/15 text-warning hover:bg-warning/25 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      Empty Bucket
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <Badge label={step.status} />
              {step.duration != null && (
                <p className="text-xs text-text-muted mt-1">{(step.duration / 1000).toFixed(1)}s</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Small banner component for empty bucket progress/status */
function EmptyBanner({
  variant,
  message,
  onDismiss,
  onRetry,
}: {
  variant: 'progress' | 'success' | 'error';
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}) {
  const styles = {
    progress: 'bg-warning/10 border-warning/30 text-warning',
    success: 'bg-success/10 border-success/30 text-success',
    error: 'bg-danger/10 border-danger/30 text-danger',
  };
  const icons = {
    progress: <Loader2 size={16} className="animate-spin" />,
    success: <CheckCircle2 size={16} />,
    error: <XCircle size={16} />,
  };
  const titles = {
    progress: 'Emptying Bucket...',
    success: 'Bucket Emptied',
    error: 'Empty Failed',
  };

  return (
    <div className={`border rounded-lg p-3 ${styles[variant]}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icons[variant]}
        {titles[variant]}
      </div>
      {message && <p className="text-xs text-text-muted mt-1 pl-6">{message}</p>}
      {(onDismiss || onRetry) && (
        <div className="flex gap-3 mt-2 pl-6">
          {onRetry && (
            <button onClick={onRetry} className="text-xs text-warning hover:text-warning/80 underline">
              Retry
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss} className="text-xs text-text-muted hover:text-text-primary underline">
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
