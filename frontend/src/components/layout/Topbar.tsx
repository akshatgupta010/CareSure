import React from 'react';
import {
  Search,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, setMode } = useTheme();

  return (
    <header className="h-16 bg-bg-surface border-b border-border-subtle px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
      {/* Left: Global Search */}
      <div className="flex items-center gap-3">
        <div className="relative w-72 md:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search claims, patients, encounters..."
            className="w-full bg-bg-subtle border border-border-subtle rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-main placeholder:text-text-muted outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* Light / Dark Mode Toggle */}
        <button
          onClick={() => setMode(isDark ? 'light' : 'dark')}
          className="w-8 h-8 rounded-xl bg-bg-subtle border border-border-subtle text-text-muted hover:text-text-main flex items-center justify-center transition-colors"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User Chip */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border-subtle ml-1">
          <div className="w-8 h-8 rounded-full bg-brand/20 text-brand font-extrabold text-xs flex items-center justify-center shadow-inner">
            {user?.name?.substring(0, 2).toUpperCase() || 'AK'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-text-main leading-tight">
              {user?.name || 'Admin Reviewer'}
            </div>
            <div className="text-[10px] text-text-muted">
              {user?.team || 'Claims Team'}
            </div>
          </div>
          <button
            onClick={logout}
            className="text-text-muted hover:text-rose-600 transition-colors p-1"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};
