import { cn } from '../../lib/cn';

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, value * 100));

  return (
    <div className={cn('w-full h-2 bg-bg-tertiary rounded-full overflow-hidden', className)}>
      <div
        className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
