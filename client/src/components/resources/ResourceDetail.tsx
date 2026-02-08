import { X, Plus, Minus, Trash2, Loader2, CheckCircle2, AlertCircle, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ServiceIcon } from '../shared/ServiceIcon';
import { Badge } from '../shared/Badge';
import { formatDate, formatBytes, formatNumber, formatEstimate } from '../../lib/format';
import { useDeletionStore } from '../../stores/deletion-store';
import { useBucketStore } from '../../stores/bucket-store';
import { useCostStore } from '../../stores/cost-store';
import { useProfileStore } from '../../stores/profile-store';
import { useEmptyBucket } from '../../hooks/use-empty-bucket';

interface Resource {
  id: string;
  arn?: string;
  type: string;
  name: string;
  region: string;
  service: string;
  status: string;
  createdAt?: string;
  lastModified?: string;
  managed: boolean;
  stackId?: string;
  stackName?: string;
  metadata: Record<string, unknown>;
}

interface Props {
  resource: Resource;
  onClose: () => void;
}

export function ResourceDetail({ resource: r, onClose }: Props) {
  const { queue, addToQueue, removeFromQueue } = useDeletionStore();
  const inQueue = queue.includes(r.id);
  const { status: emptyStatus, message: emptyMessage, error: emptyError, emptyBucket, resetEmpty } = useEmptyBucket();
  const profile = useProfileStore((s) => s.selectedProfile);
  const bucketStats = useBucketStore((s) => s.stats);
  const statsLoading = useBucketStore((s) => s.statsLoading);
  const fetchStats = useBucketStore((s) => s.fetchStats);
  const estimates = useCostStore((s) => s.estimates);
  const navigate = useNavigate();

  const isS3 = r.type === 's3-bucket';
  const stats = isS3 ? bucketStats[r.name] : undefined;

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-bg-secondary border-l border-border z-30 shadow-2xl overflow-y-auto">
      <div className="sticky top-0 bg-bg-secondary border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ServiceIcon service={r.service} size={20} />
          <h3 className="text-base font-semibold truncate">{r.name}</h3>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => (inQueue ? removeFromQueue(r.id) : addToQueue([r.id]))}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              inQueue
                ? 'bg-danger/20 text-danger hover:bg-danger/30 border border-danger/30'
                : 'bg-accent/20 text-accent hover:bg-accent/30 border border-accent/30'
            }`}
          >
            {inQueue ? <Minus size={16} /> : <Plus size={16} />}
            {inQueue ? 'Remove from deletion queue' : 'Add to deletion queue'}
          </button>

          {/* Empty Bucket button — only for S3 buckets */}
          {isS3 && emptyStatus === 'idle' && (
            <button
              onClick={() => emptyBucket(r.id, r.name)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors bg-warning/15 text-warning hover:bg-warning/25 border border-warning/30"
            >
              <Trash2 size={16} />
              Empty Bucket
            </button>
          )}

          {/* Empty Bucket progress */}
          {isS3 && emptyStatus === 'emptying' && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-warning text-sm font-medium">
                <Loader2 size={16} className="animate-spin" />
                Emptying Bucket...
              </div>
              {emptyMessage && (
                <p className="text-xs text-text-muted mt-1.5 pl-6">{emptyMessage}</p>
              )}
            </div>
          )}

          {/* Empty Bucket complete */}
          {isS3 && emptyStatus === 'complete' && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle2 size={16} />
                Bucket Emptied
              </div>
              {emptyMessage && (
                <p className="text-xs text-text-muted mt-1.5 pl-6">{emptyMessage}</p>
              )}
              <button
                onClick={resetEmpty}
                className="text-xs text-text-muted hover:text-text-primary mt-2 pl-6 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Empty Bucket error */}
          {isS3 && emptyStatus === 'error' && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-danger text-sm font-medium">
                <AlertCircle size={16} />
                Failed to Empty Bucket
              </div>
              {emptyError && (
                <p className="text-xs text-text-muted mt-1.5 pl-6">{emptyError}</p>
              )}
              <div className="flex gap-3 mt-2 pl-6">
                <button
                  onClick={() => emptyBucket(r.id, r.name)}
                  className="text-xs text-warning hover:text-warning/80 underline"
                >
                  Retry
                </button>
                <button
                  onClick={resetEmpty}
                  className="text-xs text-text-muted hover:text-text-primary underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Browse Objects — S3 only */}
          {isS3 && (
            <button
              onClick={() => navigate(`/s3/${encodeURIComponent(r.name)}`)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border"
            >
              <FolderOpen size={16} />
              Browse Objects
            </button>
          )}
        </div>

        {/* Info grid */}
        <div className="space-y-3">
          <Row label="ID" value={r.id} />
          {r.arn && <Row label="ARN" value={r.arn} />}
          <Row label="Type" value={r.type} />
          <Row label="Region" value={r.region} />
          <Row label="Status">
            <Badge label={r.status} />
          </Row>
          <Row label="Est. Cost">
            <span className="text-xs text-text-primary font-mono">
              {estimates[r.id] != null ? `${formatEstimate(estimates[r.id])}/mo` : 'N/A'}
            </span>
          </Row>
          <Row label="Source">
            <Badge label={r.managed ? 'Managed' : 'Loose'} variant={r.managed ? 'managed' : 'loose'} />
          </Row>
          {r.stackName && <Row label="Stack" value={r.stackName} />}
          <Row label="Created" value={formatDate(r.createdAt)} />
          {r.lastModified && <Row label="Last Modified" value={formatDate(r.lastModified)} />}
          {isS3 && stats && (
            <>
              <Row label="Objects" value={formatNumber(stats.objectCount)} />
              <Row label="Total Size" value={formatBytes(stats.totalSize)} />
            </>
          )}
          {isS3 && !stats && !statsLoading[r.name] && (
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs text-text-muted whitespace-nowrap">Size</span>
              <button
                onClick={() => profile && fetchStats(r.name, profile)}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Fetch size info
              </button>
            </div>
          )}
          {isS3 && statsLoading[r.name] && (
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs text-text-muted whitespace-nowrap">Size</span>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> Loading...
              </span>
            </div>
          )}
        </div>

        {/* Metadata */}
        {Object.keys(r.metadata).length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Details</h4>
            <div className="space-y-2">
              {Object.entries(r.metadata).map(([key, val]) => {
                if (val === undefined || val === null || key === 'tags') return null;
                const display = typeof val === 'object' ? JSON.stringify(val) : String(val);
                return <Row key={key} label={key} value={display} />;
              })}
            </div>

            {/* Tags */}
            {r.metadata.tags != null && typeof r.metadata.tags === 'object' && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(r.metadata.tags as Record<string, string>).map(([k, v]) => (
                    <span key={k} className="text-xs bg-bg-tertiary border border-border rounded px-2 py-1">
                      <span className="text-text-muted">{k}:</span> <span className="text-text-primary">{v}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-text-muted whitespace-nowrap">{label}</span>
      {children ?? <span className="text-xs text-text-primary text-right break-all">{value ?? '-'}</span>}
    </div>
  );
}
