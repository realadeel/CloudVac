import { ChevronRight, Home } from 'lucide-react';

interface Props {
  prefix: string;
  onNavigate: (prefix: string) => void;
}

export function BreadcrumbNav({ prefix, onNavigate }: Props) {
  const segments = prefix ? prefix.replace(/\/$/, '').split('/') : [];

  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto">
      <button
        onClick={() => onNavigate('')}
        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
          prefix === '' ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <Home size={14} />
        <span>root</span>
      </button>
      {segments.map((seg, i) => {
        const segPrefix = segments.slice(0, i + 1).join('/') + '/';
        const isLast = i === segments.length - 1;
        return (
          <span key={segPrefix} className="flex items-center gap-1">
            <ChevronRight size={12} className="text-text-muted shrink-0" />
            <button
              onClick={() => onNavigate(segPrefix)}
              className={`px-1.5 py-1 rounded transition-colors truncate max-w-[200px] ${
                isLast ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {seg}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
