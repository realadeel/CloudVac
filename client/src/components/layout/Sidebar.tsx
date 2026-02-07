import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Trash2, ScrollText, CloudCog } from 'lucide-react';
import { cn } from '../../lib/cn';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/resources', label: 'Resources', icon: Server },
  { to: '/deletion', label: 'Deletion Queue', icon: Trash2 },
  { to: '/logs', label: 'Activity Log', icon: ScrollText },
];

export function Sidebar() {
  return (
    <aside className="w-56 h-screen bg-bg-secondary border-r border-border flex flex-col fixed left-0 top-0">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <CloudCog size={24} className="text-accent" />
          <div>
            <h1 className="text-base font-bold text-text-primary leading-tight">AWS Auditor</h1>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Cost & Cleanup</p>
          </div>
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
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-[10px] text-text-muted">Dry-run mode ON by default</p>
      </div>
    </aside>
  );
}
