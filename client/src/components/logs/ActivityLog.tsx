import { AlertCircle, CheckCircle2, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { useLogStore } from '../../stores/log-store';
import { EmptyState } from '../shared/EmptyState';
import { ScrollText } from 'lucide-react';

const icons = {
  info: <Info size={14} className="text-info" />,
  warn: <AlertTriangle size={14} className="text-warning" />,
  error: <AlertCircle size={14} className="text-danger" />,
  success: <CheckCircle2 size={14} className="text-success" />,
};

const bgColors = {
  info: '',
  warn: 'bg-warning/5',
  error: 'bg-danger/5',
  success: 'bg-success/5',
};

export function ActivityLog() {
  const { logs, clear } = useLogStore();

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<ScrollText size={48} />}
        title="No activity yet"
        description="Activity will appear here as you scan and manage resources."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Activity Log</h2>
        <button
          onClick={clear}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          <Trash2 size={14} />
          Clear
        </button>
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-3 px-4 py-2.5 border-b border-border/30 ${bgColors[log.level]}`}
            >
              <div className="mt-0.5">{icons[log.level]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{log.message}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-text-muted">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {log.service && <span className="text-[10px] text-text-muted">{log.service}</span>}
                  {log.region && <span className="text-[10px] text-text-muted">{log.region}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
