import { create } from 'zustand';

interface DeletionStep {
  step: number;
  id: string;
  name: string;
  type: string;
  region: string;
  action: string;
  status: 'pending' | 'deleting' | 'deleted' | 'failed';
  error?: string;
  duration?: number;
}

interface DeletionStore {
  queue: string[]; // resource IDs
  dryRun: boolean;
  jobId: string | null;
  status: 'idle' | 'planning' | 'previewing' | 'executing' | 'complete' | 'error';
  steps: DeletionStep[];
  warnings: string[];
  progress: number;
  error: string | null;

  addToQueue: (ids: string[]) => void;
  removeFromQueue: (id: string) => void;
  removeMultipleFromQueue: (ids: string[]) => void;
  clearQueue: () => void;
  toggleDryRun: () => void;
  setJobId: (id: string) => void;
  setStatus: (s: DeletionStore['status']) => void;
  setSteps: (steps: DeletionStep[]) => void;
  updateStep: (id: string, update: Partial<DeletionStep>) => void;
  setWarnings: (w: string[]) => void;
  setProgress: (p: number) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useDeletionStore = create<DeletionStore>((set) => ({
  queue: [],
  dryRun: true,
  jobId: null,
  status: 'idle',
  steps: [],
  warnings: [],
  progress: 0,
  error: null,

  addToQueue: (ids) => set((s) => ({ queue: [...new Set([...s.queue, ...ids])] })),
  removeFromQueue: (id) => set((s) => ({ queue: s.queue.filter((i) => i !== id) })),
  removeMultipleFromQueue: (ids) => set((s) => {
    const toRemove = new Set(ids);
    return { queue: s.queue.filter((i) => !toRemove.has(i)) };
  }),
  clearQueue: () => set({ queue: [] }),
  toggleDryRun: () => set((s) => ({ dryRun: !s.dryRun })),
  setJobId: (jobId) => set({ jobId }),
  setStatus: (status) => set({ status }),
  setSteps: (steps) => set({ steps }),
  updateStep: (id, update) =>
    set((s) => ({
      steps: s.steps.map((step) => (step.id === id ? { ...step, ...update } : step)),
    })),
  setWarnings: (warnings) => set({ warnings }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  reset: () => set({ jobId: null, status: 'idle', steps: [], warnings: [], progress: 0, error: null }),
}));
