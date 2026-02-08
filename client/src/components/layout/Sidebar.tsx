import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Trash2, CloudCog } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useDeletionStore } from '../../stores/deletion-store';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/resources', label: 'Resources', icon: Server },
  { to: '/deletion', label: 'Deletion Queue', icon: Trash2 },
];

export function Sidebar() {
  const queueCount = useDeletionStore((s) => s.queue.length);

  return (
    <aside className="w-56 h-screen bg-bg-secondary border-r border-border flex flex-col fixed left-0 top-0">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <CloudCog size={24} className="text-accent" />
          <h1 className="text-base font-bold text-text-primary leading-tight">CloudVac</h1>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              )
            }
          >
            <link.icon size={18} />
            {link.label}
            {link.to === '/deletion' && queueCount > 0 && (
              <span className="ml-auto bg-accent text-bg-primary text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                {queueCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-[10px] text-text-muted">Toggle dry-run in header</p>
      </div>
    </aside>
  );
}
