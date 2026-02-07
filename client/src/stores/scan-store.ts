import { create } from 'zustand';
import { fetchJSON } from '../api/client';

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

interface ScanProgress {
  service: string;
  region: string;
  status: 'scanning' | 'complete' | 'error';
  count?: number;
  error?: string;
}

interface ScanStore {
  status: 'idle' | 'scanning' | 'complete' | 'error';
  resources: Resource[];
  progress: ScanProgress[];
  overallProgress: number;
  totalStacks: number;
  scannedAt: string | null;
  error: string | null;

  setStatus: (status: ScanStore['status']) => void;
  addProgress: (p: ScanProgress) => void;
  setOverallProgress: (p: number) => void;
  setResources: (resources: Resource[]) => void;
  setTotalStacks: (n: number) => void;
  setScannedAt: (s: string | null) => void;
  setError: (e: string | null) => void;
  reset: () => void;
  loadCachedResources: (profile: string) => Promise<void>;
}

export const useScanStore = create<ScanStore>((set) => ({
  status: 'idle',
  resources: [],
  progress: [],
  overallProgress: 0,
  totalStacks: 0,
  scannedAt: null,
  error: null,

  setStatus: (status) => set({ status }),
  addProgress: (p) => set((s) => ({ progress: [...s.progress, p] })),
  setOverallProgress: (overallProgress) => set({ overallProgress }),
  setResources: (resources) => set({ resources }),
  setTotalStacks: (totalStacks) => set({ totalStacks }),
  setScannedAt: (scannedAt) => set({ scannedAt }),
  setError: (error) => set({ error }),
  reset: () => set({ status: 'idle', resources: [], progress: [], overallProgress: 0, totalStacks: 0, scannedAt: null, error: null }),

  loadCachedResources: async (profile) => {
    try {
      const resp = await fetchJSON<{ resources: Resource[]; scannedAt: string | null }>(
        `/resources?profile=${encodeURIComponent(profile)}`
      );
      if (resp.resources.length > 0) {
        set({
          resources: resp.resources,
          status: 'complete',
          scannedAt: resp.scannedAt ?? null,
          error: null,
        });
      } else {
        set({ resources: [], status: 'idle', scannedAt: null });
      }
    } catch {
      // Silently fail — cached data is optional
      set({ resources: [], status: 'idle', scannedAt: null });
    }
  },
}));
