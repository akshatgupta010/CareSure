import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  TrendingDown,
  Users,
  FolderOpen,
  History,
  BarChart2,
  Settings,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Claims', to: '/claims', icon: FileText },
    { label: 'Verification', to: '/verification', icon: ShieldCheck, badge: '5' },
    { label: 'Revenue Leakage', to: '/revenue-leakage', icon: TrendingDown },
    { label: 'Patients', to: '/patients', icon: Users },
    { label: 'Documents', to: '/documents', icon: FolderOpen },
    { label: 'Audit Trail', to: '/audit-trail', icon: History },
    { label: 'Analytics', to: '/analytics', icon: BarChart2 },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-sidebar-bg border-r border-sidebar-border flex flex-col justify-between h-screen fixed inset-y-0 left-0 z-30 select-none">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border/60">
          <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand flex items-center justify-center shadow-inner">
            <Stethoscope size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="text-white font-extrabold text-base tracking-tight flex items-center gap-1.5">
              CareSure
            </div>
            <div className="text-[10px] font-bold tracking-widest text-sidebar-text/70 uppercase">
              Revenue Integrity
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150',
                  isActive
                    ? 'bg-sidebar-active text-white shadow-sm font-bold'
                    : 'text-sidebar-text hover:text-white hover:bg-white/5'
                )
              }
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className="shrink-0 stroke-[2]" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-risk-high-bg text-risk-high-text px-1.5 py-0.5 rounded-md text-[10px] font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-4 m-3 rounded-2xl bg-white/5 border border-white/10 text-left">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>System Online</span>
        </div>
        <p className="text-[10.5px] text-sidebar-text/70 leading-relaxed mt-1">
          Connected to CareSure Clinical AI Engine & MongoDB Database.
        </p>
      </div>
    </aside>
  );
};
