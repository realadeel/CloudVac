import { CheckCircle2, XCircle, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { useDeletionStore } from '../../stores/deletion-store';
import { ProgressBar } from '../shared/ProgressBar';
import { ServiceIcon } from '../shared/ServiceIcon';
import { Badge } from '../shared/Badge';

export function DeletionProgress() {
  const { status, steps, warnings, progress, dryRun, reset } = useDeletionStore();

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
