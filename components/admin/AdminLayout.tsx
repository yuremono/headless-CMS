import type { ReactNode } from 'react';
import { getAuthProvider } from '@/lib/auth/production-config';
import { getAdminUiAccess } from '@/lib/auth/admin-ui-access';
import { AdminAccessProvider } from './AdminAccessContext';
import { AdminNav } from './AdminNav';
import type { SiteSummary } from './admin-data-types';
import { siteRouteKey } from './admin-data-utils';

interface AdminLayoutProps {
  children: ReactNode;
  site?: SiteSummary | null;
  title?: string;
}

export async function AdminLayout({ children, site }: AdminLayoutProps) {
  const siteKey = site ? siteRouteKey(site) : undefined;
  const access = await getAdminUiAccess(siteKey);
  const authProvider = getAuthProvider();

  return (
    <AdminAccessProvider access={access}>
      <div className="AdminLayout grid min-h-screen gap-6 bg-slate-950 px-4 py-4 text-slate-100 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6 lg:py-6">
        <aside className="flex flex-col rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur lg:min-h-[calc(100vh-3rem)]">
          <AdminNav site={site ?? null} authProvider={authProvider} />
        </aside>
        <main className="AdminMain min-w-0 space-y-6">{children}</main>
      </div>
    </AdminAccessProvider>
  );
}
