import { useState } from 'react';
import { Trash2, Play, Eye, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { useDeletionStore } from '../../stores/deletion-store';
import { useScanStore } from '../../stores/scan-store';
import { useDeletion } from '../../hooks/use-deletion';
import { ServiceIcon } from '../shared/ServiceIcon';
import { Badge } from '../shared/Badge';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { DeletionProgress } from './DeletionProgress';
import { EmptyState } from '../shared/EmptyState';

export function DeletionQueue() {
  const { queue, dryRun, toggleDryRun, removeFromQueue, clearQueue, status, steps, warnings } = useDeletionStore();
  const resources = useScanStore((s) => s.resources);
  const { executeDeletion } = useDeletion();
  const [showConfirm, setShowConfirm] = useState(false);

  const queuedResources = resources.filter((r) => queue.includes(r.id));

  if (queue.length === 0 && status === 'idle') {
    return (
      <EmptyState
        icon={<Trash2 size={48} />}
        title="Deletion queue is empty"
        description="Select resources from the Resources page and add them to the deletion queue."
      />
    );
  }

  if (status === 'executing' || status === 'previewing' || (status === 'complete' && steps.length > 0)) {
    return <DeletionProgress />;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{queue.length} resource(s) queued</h2>
          <button
            onClick={toggleDryRun}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {dryRun ? <ToggleLeft size={20} className="text-success" /> : <ToggleRight size={20} className="text-danger" />}
            {dryRun ? 'Dry Run ON' : 'Dry Run OFF'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={clearQueue}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <X size={16} />
            Clear
          </button>

          {dryRun ? (
            <button
              onClick={executeDeletion}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Eye size={16} />
              Preview Deletion Plan
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-danger hover:bg-danger-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Play size={16} />
              Execute Deletion
            </button>
          )}
        </div>
      </div>

      {/* Queue list */}
      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        {queuedResources.map((r) => (
          <div key={r.id} className="flex items-center px-4 py-3 border-b border-border/50 hover:bg-bg-hover/30">
            <ServiceIcon service={r.service} size={16} className="mr-3" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-text-primary">{r.name}</span>
              <p className="text-xs text-text-muted">{r.type} in {r.region}</p>
            </div>
            <Badge label={r.managed ? 'Managed' : 'Loose'} variant={r.managed ? 'managed' : 'loose'} />
            <button
              onClick={() => removeFromQueue(r.id)}
              className="ml-3 p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {!dryRun && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4">
          <p className="text-sm text-danger font-medium">
            Dry run is OFF. Clicking "Execute Deletion" will permanently delete the selected resources.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="Confirm Deletion"
        message={`You are about to permanently delete ${queue.length} resource(s). This action cannot be undone.`}
        confirmText="Delete Resources"
        requireTyping="delete"
        onConfirm={() => {
          setShowConfirm(false);
          executeDeletion();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
