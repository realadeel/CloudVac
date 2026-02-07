import { create } from 'zustand';
import { fetchJSON } from '../api/client';

interface ServiceCost {
  service: string;
  amount: number;
  currency: string;
}

interface CostStore {
  period: { start: string; end: string } | null;
  total: number;
  byService: ServiceCost[];
  loading: boolean;
  error: string | null;
  fetchCosts: (profile: string) => Promise<void>;
  reset: () => void;
}

export const useCostStore = create<CostStore>((set) => ({
  period: null,
  total: 0,
  byService: [],
  loading: false,
  error: null,

  fetchCosts: async (profile) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchJSON<{ period: { start: string; end: string }; total: number; byService: ServiceCost[] }>(
        `/costs?profile=${encodeURIComponent(profile)}`
      );
      set({ period: data.period, total: data.total, byService: data.byService, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  reset: () => set({ period: null, total: 0, byService: [], loading: false, error: null }),
}));
