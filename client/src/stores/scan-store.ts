import { create } from 'zustand';

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
  error: string | null;

  setStatus: (status: ScanStore['status']) => void;
  addProgress: (p: ScanProgress) => void;
  setOverallProgress: (p: number) => void;
  setResources: (resources: Resource[]) => void;
  setTotalStacks: (n: number) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useScanStore = create<ScanStore>((set) => ({
  status: 'idle',
  resources: [],
  progress: [],
  overallProgress: 0,
  totalStacks: 0,
  error: null,

  setStatus: (status) => set({ status }),
  addProgress: (p) => set((s) => ({ progress: [...s.progress, p] })),
  setOverallProgress: (overallProgress) => set({ overallProgress }),
  setResources: (resources) => set({ resources }),
  setTotalStacks: (totalStacks) => set({ totalStacks }),
  setError: (error) => set({ error }),
  reset: () => set({ status: 'idle', resources: [], progress: [], overallProgress: 0, totalStacks: 0, error: null }),
}));
