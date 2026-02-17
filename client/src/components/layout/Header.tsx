import { useEffect, useCallback, useRef } from "react";
import { Scan, ChevronDown, ShieldCheck, ShieldOff } from "lucide-react";
import { useProfileStore } from "../../stores/profile-store";
import { useScanStore } from "../../stores/scan-store";
import { useDeletionStore } from "../../stores/deletion-store";
import { useBucketStore } from "../../stores/bucket-store";
import { useCostStore } from "../../stores/cost-store";
import { useScan } from "../../hooks/use-scan";
import { Spinner } from "../shared/Spinner";
import { ProgressBar } from "../shared/ProgressBar";

export function Header() {
  const profiles = useProfileStore((s) => s.profiles);
  const selectedProfile = useProfileStore((s) => s.selectedProfile);
  const fetchProfiles = useProfileStore((s) => s.fetchProfiles);
  const selectProfile = useProfileStore((s) => s.selectProfile);
  const scanStatus = useScanStore((s) => s.status);
  const progress = useScanStore((s) => s.overallProgress);
  const scannedAt = useScanStore((s) => s.scannedAt);
  const loadCachedResources = useScanStore((s) => s.loadCachedResources);
  const dryRun = useDeletionStore((s) => s.dryRun);
  const toggleDryRun = useDeletionStore((s) => s.toggleDryRun);
  const clearQueue = useDeletionStore((s) => s.clearQueue);
  const loadCachedStats = useBucketStore((s) => s.loadCachedStats);
  const fetchEstimates = useCostStore((s) => s.fetchEstimates);
  const { startScan } = useScan();

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // When profile changes, load cached resources + bucket stats + cost estimates instantly
  useEffect(() => {
    if (selectedProfile && scanStatus !== "scanning") {
      clearQueue();
      loadCachedResources(selectedProfile);
      loadCachedStats(selectedProfile);
      fetchEstimates(selectedProfile);
    }
  }, [selectedProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // When scan completes, refresh cost estimates (new resources may have been found)
  const prevScanStatus = useRef(scanStatus);
  useEffect(() => {
    if (
      prevScanStatus.current === "scanning" &&
      scanStatus === "complete" &&
      selectedProfile
    ) {
      // Small delay so the resources fetch can finish first
      const timer = setTimeout(() => fetchEstimates(selectedProfile), 500);
      return () => clearTimeout(timer);
    }
    prevScanStatus.current = scanStatus;
  }, [scanStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProfileChange = useCallback(
    (name: string) => {
      selectProfile(name);
    },
    [selectProfile],
  );

  const lastScanLabel = scannedAt
    ? `Last scan: ${new Date(scannedAt + "Z").toLocaleString()}`
    : null;

  return (
    <header className="h-14 bg-bg-secondary border-b border-border flex items-center justify-between px-3 sm:px-4 md:px-6 fixed top-0 left-0 md:left-56 right-0 z-10">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 pl-10 md:pl-0">
        {/* Profile selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-text-muted hidden lg:inline">
            AWS Profile:
          </span>
          <div className="relative">
            <select
              value={selectedProfile ?? ""}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="appearance-none bg-bg-tertiary border border-border rounded-lg px-3 py-1.5 pr-8 text-sm text-text-primary focus:outline-none focus:border-accent cursor-pointer max-w-[140px] sm:max-w-none"
            >
              {profiles.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
          </div>
        </div>

        {/* Scan progress */}
        {scanStatus === "scanning" && (
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Spinner size="sm" />
            <span className="text-sm text-text-secondary hidden sm:inline">
              Scanning...
            </span>
            <div className="w-20 sm:w-32">
              <ProgressBar value={progress} />
            </div>
            <span className="text-xs text-text-muted">
              {Math.round(progress * 100)}%
            </span>
          </div>
        )}

        {/* Last scan timestamp — hide on small screens */}
        {lastScanLabel && scanStatus !== "scanning" && (
          <span className="text-xs text-text-muted hidden lg:inline">
            {lastScanLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Dry-run toggle */}
        <button
          onClick={toggleDryRun}
          title={
            dryRun
              ? "Preview deletions without actually removing resources"
              : "Deletions will permanently remove AWS resources"
          }
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            dryRun
              ? "bg-success/10 text-success border-success/30 hover:bg-success/20"
              : "bg-danger/10 text-danger border-danger/30 hover:bg-danger/20"
          }`}
        >
          {dryRun ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}
          <span className="hidden sm:inline">
            {dryRun ? "Dry Run" : "LIVE"}
          </span>
        </button>

        {/* Scan button */}
        <button
          onClick={startScan}
          disabled={!selectedProfile || scanStatus === "scanning"}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Scan size={16} />
          <span className="hidden sm:inline">
            {scanStatus === "scanning" ? "Scanning..." : "Scan Account"}
          </span>
          <span className="sm:hidden">Scan</span>
        </button>
      </div>
    </header>
  );
}
