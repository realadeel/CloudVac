import { useState } from 'react';
import { Search, AlertTriangle, Loader2, Trash2, X, RefreshCw } from 'lucide-react';
import { useDeletionStore } from '../../stores/deletion-store';
import { useProfileStore } from '../../stores/profile-store';
import { fetchJSON } from '../../api/client';
import { formatBytes } from '../../lib/format';

interface OrphanedLogGroup {
  id: string;
  name: string;
  region: string;
  expectedResource: string;
  service: string;
  storedBytes: number;
  retentionDays: number | string;
  createdAt?: string;
}

export function OrphanedLogGroupAction() {
  const profile = useProfileStore((s) => s.selectedProfile);
  const addToQueue = useDeletionStore((s) => s.addToQueue);
  const queue = useDeletionStore((s) => s.queue);

  const [orphans, setOrphans] = useState<OrphanedLogGroup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const scanOrphans = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchJSON<{ orphaned: OrphanedLogGroup[]; total: number }>(
        `/actions/orphaned-log-groups?profile=${encodeURIComponent(profile)}`
      );
      setOrphans(resp.orphaned);
      if (resp.orphaned.length > 0) setModalOpen(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Filter out orphans already in the deletion queue
  const queueSet = new Set(queue);
  const remaining = orphans?.filter((o) => !queueSet.has(o.id)) ?? [];
  const totalBytes = remaining.reduce((sum, o) => sum + (o.storedBytes ?? 0), 0);

  return (
    <>
      <div className="bg-bg-tertiary rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Search size={16} className="text-warning" />
            <div>
              <p className="text-sm font-medium">Find Orphaned Log Groups</p>
              <p className="text-xs text-text-muted">CloudWatch log groups whose resources no longer exist</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {orphans !== null && !loading && remaining.length > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-warning font-medium hover:text-warning/80 transition-colors"
              >
                {remaining.length} found
              </button>
            )}
            {orphans !== null && !loading && remaining.length === 0 && (
              <span className="text-xs text-text-muted">
                {orphans.length > 0 ? 'All queued' : 'None found'}
              </span>
            )}
            <button
              onClick={scanOrphans}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-accent/15 hover:bg-accent/25 text-accent text-xs font-medium rounded-lg border border-accent/30 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              {loading ? 'Scanning...' : orphans ? 'Re-scan' : 'Scan'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 text-xs text-danger flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {error}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && remaining.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-bg-secondary border border-border rounded-xl max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-lg font-semibold">Orphaned Log Groups</h3>
                <p className="text-xs text-text-muted mt-1">
                  {remaining.length} log group{remaining.length !== 1 ? 's' : ''} with no matching resource
                  {totalBytes > 0 && <> &middot; {formatBytes(totalBytes)} stored</>}
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-3">
              <div className="space-y-1">
                {remaining.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-tertiary text-xs hover:bg-bg-hover/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <span className="text-text-primary font-mono text-[13px] truncate block">{o.name}</span>
                      <span className="text-text-muted">
                        {o.service} <span className="font-mono">{o.expectedResource}</span> not found &middot; {o.region}
                        {o.storedBytes > 0 && <> &middot; {formatBytes(o.storedBytes)}</>}
                      </span>
                    </div>
                    <button
                      onClick={() => addToQueue([o.id])}
                      className="ml-3 p-1.5 text-text-muted hover:text-danger transition-colors shrink-0"
                      title="Add to deletion queue"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { addToQueue(remaining.map((o) => o.id)); setModalOpen(false); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-danger bg-danger/15 hover:bg-danger/25 rounded-lg border border-danger/30 transition-colors"
              >
                <Trash2 size={14} />
                Queue all for deletion
              </button>
            </div>

            {/* Rescan hint */}
            <div className="px-4 pb-3 shrink-0">
              <p className="text-[11px] text-text-muted flex items-center gap-1.5">
                <RefreshCw size={10} />
                Rescan your account after deletion to refresh results
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
