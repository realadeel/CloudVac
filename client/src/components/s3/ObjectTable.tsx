import { Folder, File, Loader2 } from 'lucide-react';
import { formatBytes, formatRelativeDate } from '../../lib/format';

interface S3Folder {
  name: string;
  prefix: string;
}

interface S3Object {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  storageClass: string;
}

interface Props {
  folders: S3Folder[];
  objects: S3Object[];
  loading: boolean;
  onFolderClick: (prefix: string) => void;
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function ObjectTable({ folders, objects, loading, onFolderClick, nextCursor, loadingMore, onLoadMore }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 size={24} className="animate-spin mr-3" />
        Loading objects...
      </div>
    );
  }

  if (folders.length === 0 && objects.length === 0) {
    return (
      <div className="text-center py-20 text-sm text-text-muted">
        This location is empty.
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-2.5 border-b border-border bg-bg-tertiary/50 text-[11px] font-medium text-text-muted uppercase tracking-wider">
        <div className="flex-1">Name</div>
        <div className="w-[120px] text-right">Size</div>
        <div className="w-[140px] text-right">Modified</div>
        <div className="w-[120px] text-right">Storage Class</div>
      </div>

      {/* Rows */}
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
        {/* Folders first */}
        {folders.map((f) => (
          <div
            key={f.prefix}
            onClick={() => onFolderClick(f.prefix)}
            className="flex items-center px-4 py-2.5 border-b border-border/40 hover:bg-bg-hover/50 transition-colors cursor-pointer"
          >
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Folder size={16} className="text-accent shrink-0" />
              <span className="text-sm font-medium text-text-primary truncate">{f.name}/</span>
            </div>
            <div className="w-[120px] text-right text-xs text-text-muted">-</div>
            <div className="w-[140px] text-right text-xs text-text-muted">-</div>
            <div className="w-[120px] text-right text-xs text-text-muted">-</div>
          </div>
        ))}

        {/* Objects */}
        {objects.map((obj) => (
          <div
            key={obj.key}
            className="flex items-center px-4 py-2.5 border-b border-border/40 hover:bg-bg-hover/30 transition-colors"
          >
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <File size={16} className="text-text-muted shrink-0" />
              <span className="text-sm text-text-primary truncate">{obj.name}</span>
            </div>
            <div className="w-[120px] text-right text-xs text-text-secondary">{formatBytes(obj.size)}</div>
            <div className="w-[140px] text-right text-xs text-text-secondary">{formatRelativeDate(obj.lastModified)}</div>
            <div className="w-[120px] text-right text-xs text-text-secondary">{obj.storageClass}</div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {nextCursor && (
        <div className="px-4 py-3 border-t border-border bg-bg-tertiary/50 text-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-sm text-accent hover:text-accent-hover font-medium transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Loading more...
              </span>
            ) : (
              'Load more objects'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
