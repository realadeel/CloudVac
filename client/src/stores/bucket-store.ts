import { create } from 'zustand';
import { fetchJSON } from '../api/client';

interface BucketStats {
  objectCount: number;
  totalSize: number;
  computedAt: string;
}

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

interface BucketStore {
  // --- Per-bucket stats (keyed by bucket name) ---
  stats: Record<string, BucketStats>;
  statsLoading: Record<string, boolean>;
  statsErrors: Record<string, string>;
  fetchStats: (bucketName: string, profile: string) => Promise<void>;
  loadCachedStats: (profile: string) => Promise<void>;

  // --- Object browsing (single active bucket) ---
  prefix: string;
  folders: S3Folder[];
  objects: S3Object[];
  nextCursor: string | null;
  browsing: boolean;
  browsingMore: boolean;
  browseError: string | null;
  fetchObjects: (bucketName: string, profile: string, prefix?: string) => Promise<void>;
  loadMore: (bucketName: string, profile: string) => Promise<void>;
  resetBrowse: () => void;
}

export const useBucketStore = create<BucketStore>((set, get) => ({
  stats: {},
  statsLoading: {},
  statsErrors: {},

  fetchStats: async (bucketName, profile) => {
    set((s) => ({
      statsLoading: { ...s.statsLoading, [bucketName]: true },
      statsErrors: { ...s.statsErrors, [bucketName]: '' },
    }));
    try {
      const data = await fetchJSON<BucketStats>(
        `/s3/${encodeURIComponent(bucketName)}/stats?profile=${encodeURIComponent(profile)}`
      );
      set((s) => ({
        stats: { ...s.stats, [bucketName]: data },
        statsLoading: { ...s.statsLoading, [bucketName]: false },
      }));
    } catch (err) {
      set((s) => ({
        statsLoading: { ...s.statsLoading, [bucketName]: false },
        statsErrors: { ...s.statsErrors, [bucketName]: (err as Error).message },
      }));
    }
  },

  loadCachedStats: async (profile) => {
    try {
      const data = await fetchJSON<{ stats: Record<string, BucketStats> }>(
        `/s3/stats/all?profile=${encodeURIComponent(profile)}`
      );
      if (data.stats && Object.keys(data.stats).length > 0) {
        set({ stats: data.stats, statsLoading: {}, statsErrors: {} });
      } else {
        set({ stats: {}, statsLoading: {}, statsErrors: {} });
      }
    } catch {
      // Non-critical — just start with empty stats
      set({ stats: {}, statsLoading: {}, statsErrors: {} });
    }
  },

  prefix: '',
  folders: [],
  objects: [],
  nextCursor: null,
  browsing: false,
  browsingMore: false,
  browseError: null,

  fetchObjects: async (bucketName, profile, prefix = '') => {
    set({ browsing: true, browseError: null, prefix, folders: [], objects: [], nextCursor: null });
    try {
      const data = await fetchJSON<{
        folders: S3Folder[];
        objects: S3Object[];
        nextCursor: string | null;
        isTruncated: boolean;
      }>(
        `/s3/${encodeURIComponent(bucketName)}/objects?profile=${encodeURIComponent(profile)}&prefix=${encodeURIComponent(prefix)}`
      );
      set({
        folders: data.folders,
        objects: data.objects,
        nextCursor: data.nextCursor,
        browsing: false,
      });
    } catch (err) {
      set({ browseError: (err as Error).message, browsing: false });
    }
  },

  loadMore: async (bucketName, profile) => {
    const { nextCursor, prefix } = get();
    if (!nextCursor) return;
    set({ browsingMore: true });
    try {
      const data = await fetchJSON<{
        folders: S3Folder[];
        objects: S3Object[];
        nextCursor: string | null;
        isTruncated: boolean;
      }>(
        `/s3/${encodeURIComponent(bucketName)}/objects?profile=${encodeURIComponent(profile)}&prefix=${encodeURIComponent(prefix)}&cursor=${encodeURIComponent(nextCursor)}`
      );
      set((s) => ({
        objects: [...s.objects, ...data.objects],
        folders: [...s.folders, ...data.folders],
        nextCursor: data.nextCursor,
        browsingMore: false,
      }));
    } catch (err) {
      set({ browseError: (err as Error).message, browsingMore: false });
    }
  },

  resetBrowse: () =>
    set({ prefix: '', folders: [], objects: [], nextCursor: null, browsing: false, browsingMore: false, browseError: null }),
}));
