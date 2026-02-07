import { create } from 'zustand';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  service?: string;
  region?: string;
}

interface LogStore {
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
}

let logId = 0;

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  addLog: (entry) =>
    set((s) => ({
      logs: [
        { ...entry, id: String(++logId), timestamp: new Date().toISOString() },
        ...s.logs,
      ].slice(0, 500), // Keep last 500 entries
    })),
  clear: () => set({ logs: [] }),
}));
