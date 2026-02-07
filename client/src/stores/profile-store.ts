import { create } from 'zustand';
import { fetchJSON } from '../api/client';

interface ProfileInfo {
  name: string;
  region: string | null;
}

interface ProfileStore {
  profiles: ProfileInfo[];
  selectedProfile: string | null;
  loading: boolean;
  error: string | null;
  fetchProfiles: () => Promise<void>;
  selectProfile: (name: string) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profiles: [],
  selectedProfile: null,
  loading: false,
  error: null,

  fetchProfiles: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchJSON<{ profiles: ProfileInfo[] }>('/profiles');
      set({ profiles: data.profiles, loading: false });
      if (data.profiles.length > 0) {
        set({ selectedProfile: data.profiles[0].name });
      }
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  selectProfile: (name) => set({ selectedProfile: name }),
}));
