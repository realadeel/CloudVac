import { cn } from '../../lib/cn';

const variants: Record<string, string> = {
  running: 'bg-green-500/20 text-green-400 border-green-500/30',
  available: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  stopped: 'bg-red-500/20 text-red-400 border-red-500/30',
  terminated: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  managed: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  loose: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  deleting: 'bg-red-500/20 text-red-400 border-red-500/30',
  deleted: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  default: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export function Badge({ label, variant }: { label: string; variant?: string }) {
  const key = variant ?? label.toLowerCase().split(':')[0];
  const classes = variants[key] ?? variants.default;

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border', classes)}>
      {label}
    </span>
  );
}
