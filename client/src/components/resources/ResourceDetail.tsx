import { X, Plus, Minus } from 'lucide-react';
import { ServiceIcon } from '../shared/ServiceIcon';
import { Badge } from '../shared/Badge';
import { formatDate } from '../../lib/format';
import { useDeletionStore } from '../../stores/deletion-store';

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
        {/* Action */}
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

        {/* Info grid */}
        <div className="space-y-3">
          <Row label="ID" value={r.id} />
          {r.arn && <Row label="ARN" value={r.arn} />}
          <Row label="Type" value={r.type} />
          <Row label="Region" value={r.region} />
          <Row label="Status">
            <Badge label={r.status} />
          </Row>
          <Row label="Source">
            <Badge label={r.managed ? 'Managed' : 'Loose'} variant={r.managed ? 'managed' : 'loose'} />
          </Row>
          {r.stackName && <Row label="Stack" value={r.stackName} />}
          <Row label="Created" value={formatDate(r.createdAt)} />
          {r.lastModified && <Row label="Last Modified" value={formatDate(r.lastModified)} />}
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
