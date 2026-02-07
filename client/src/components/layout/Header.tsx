import { useEffect } from 'react';
import { Scan, ChevronDown } from 'lucide-react';
import { useProfileStore } from '../../stores/profile-store';
import { useScanStore } from '../../stores/scan-store';
import { useScan } from '../../hooks/use-scan';
import { Spinner } from '../shared/Spinner';
import { ProgressBar } from '../shared/ProgressBar';

export function Header() {
  const { profiles, selectedProfile, fetchProfiles, selectProfile } = useProfileStore();
  const scanStatus = useScanStore((s) => s.status);
  const progress = useScanStore((s) => s.overallProgress);
  const { startScan } = useScan();

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return (
    <header className="h-14 bg-bg-secondary border-b border-border flex items-center justify-between px-6 fixed top-0 left-56 right-0 z-10">
      <div className="flex items-center gap-4">
        <div className="relative">
          <select
            value={selectedProfile ?? ''}
            onChange={(e) => selectProfile(e.target.value)}
            className="appearance-none bg-bg-tertiary border border-border rounded-lg px-3 py-1.5 pr-8 text-sm text-text-primary focus:outline-none focus:border-accent cursor-pointer"
          >
            {profiles.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>

        {scanStatus === 'scanning' && (
          <div className="flex items-center gap-3">
            <Spinner size="sm" />
            <span className="text-sm text-text-secondary">Scanning...</span>
            <div className="w-32">
              <ProgressBar value={progress} />
            </div>
            <span className="text-xs text-text-muted">{Math.round(progress * 100)}%</span>
          </div>
        )}
      </div>

      <button
        onClick={startScan}
        disabled={!selectedProfile || scanStatus === 'scanning'}
        className="flex items-center gap-2 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Scan size={16} />
        {scanStatus === 'scanning' ? 'Scanning...' : 'Scan Account'}
      </button>
    </header>
  );
}
