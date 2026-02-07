import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, HardDrive, Loader2 } from 'lucide-react';
import { useBucketStore } from '../stores/bucket-store';
import { useProfileStore } from '../stores/profile-store';
import { useScanStore } from '../stores/scan-store';
import { BreadcrumbNav } from '../components/s3/BreadcrumbNav';
import { ObjectTable } from '../components/s3/ObjectTable';
import { formatBytes, formatNumber } from '../lib/format';

export function BucketDetailPage() {
  const { bucketName } = useParams<{ bucketName: string }>();
  const navigate = useNavigate();
  const profile = useProfileStore((s) => s.selectedProfile);
  const resources = useScanStore((s) => s.resources);

  const prefix = useBucketStore((s) => s.prefix);
  const folders = useBucketStore((s) => s.folders);
  const objects = useBucketStore((s) => s.objects);
  const nextCursor = useBucketStore((s) => s.nextCursor);
  const browsing = useBucketStore((s) => s.browsing);
  const browsingMore = useBucketStore((s) => s.browsingMore);
  const browseError = useBucketStore((s) => s.browseError);
  const fetchObjects = useBucketStore((s) => s.fetchObjects);
  const loadMore = useBucketStore((s) => s.loadMore);
  const resetBrowse = useBucketStore((s) => s.resetBrowse);

  const stats = useBucketStore((s) => bucketName ? s.stats[bucketName] : undefined);
  const statsLoading = useBucketStore((s) => bucketName ? s.statsLoading[bucketName] : false);
  const fetchStats = useBucketStore((s) => s.fetchStats);

  const bucket = resources.find((r) => r.id === bucketName && r.type === 's3-bucket');
  const bucketRegion = bucket?.region ?? (bucket?.metadata?.bucketRegion as string) ?? '';

  // Fetch root objects on mount
  useEffect(() => {
    if (bucketName && profile) {
      resetBrowse();
      fetchObjects(bucketName, profile, '');
    }
    return () => resetBrowse();
  }, [bucketName, profile, fetchObjects, resetBrowse]);

  if (!bucketName || !profile) {
    return (
      <div className="p-6 text-text-muted text-sm">
        No bucket selected or no profile active.
      </div>
    );
  }

  const handleNavigate = (newPrefix: string) => {
    fetchObjects(bucketName, profile, newPrefix);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/resources')}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            Back to Resources
          </button>
          <h1 className="text-xl font-semibold text-text-primary">{bucketName}</h1>
          {bucketRegion && (
            <p className="text-sm text-text-muted mt-0.5">{bucketRegion}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 shrink-0">
          {stats && (
            <div className="text-right">
              <p className="text-sm font-medium text-text-primary">
                {formatNumber(stats.objectCount)} objects
              </p>
              <p className="text-xs text-text-muted">{formatBytes(stats.totalSize)}</p>
            </div>
          )}
          {!stats && !statsLoading && (
            <button
              onClick={() => fetchStats(bucketName, profile)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border transition-colors"
            >
              <HardDrive size={13} />
              Get Size
            </button>
          )}
          {statsLoading && (
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <Loader2 size={13} className="animate-spin" />
              Calculating...
            </span>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <BreadcrumbNav prefix={prefix} onNavigate={handleNavigate} />

      {/* Error */}
      {browseError && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 text-sm text-danger">
          {browseError}
        </div>
      )}

      {/* Object table */}
      <ObjectTable
        folders={folders}
        objects={objects}
        loading={browsing}
        onFolderClick={handleNavigate}
        nextCursor={nextCursor}
        loadingMore={browsingMore}
        onLoadMore={() => loadMore(bucketName, profile)}
      />
    </div>
  );
}
