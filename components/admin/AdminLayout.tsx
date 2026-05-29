import type { ReactNode } from 'react';
import { AdminNav } from './AdminNav';
import type { SiteSummary } from './admin-data-types';

interface AdminLayoutProps {
  children: ReactNode;
  site?: SiteSummary | null;
  title?: string;
}

export function AdminLayout({ children, site }: AdminLayoutProps) {
  return (
    <div className="AdminLayout grid min-h-screen gap-6 bg-slate-950 px-4 py-4 text-slate-100 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6 lg:py-6">
      <aside className="flex flex-col rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur lg:min-h-[calc(100vh-3rem)]">
        <AdminNav site={site ?? null} />
      </aside>
      <main className="AdminMain min-w-0 space-y-6">{children}</main>
    </div>
  );
}
