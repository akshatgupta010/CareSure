import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppShell: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg-app text-text-main flex transition-colors">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Topbar />
        <main className="p-8 max-w-[1600px] w-full mx-auto flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
