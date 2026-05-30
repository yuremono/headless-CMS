import type {
        ReactNode
}

from 'react';

import {
        getAuthProvider
}

from '@/lib/auth/production-config';

import {
        getAdminUiAccess
}

from '@/lib/auth/admin-ui-access';

import {
        AdminAccessProvider
}

from './AdminAccessContext';

import {
        AdminNav
}

from './AdminNav';

import type {
        SiteSummary
}

from './admin-data-types';

import {
        siteRouteKey
}

from './admin-data-utils';

interface AdminLayoutProps {
        children: ReactNode;
        site?: SiteSummary | null;
        title?: string;
}

export async function AdminLayout( {
                children, site
        }

        : AdminLayoutProps) {
        const siteKey=site ? siteRouteKey(site): undefined;
        const access=await getAdminUiAccess(siteKey);
        const authProvider=getAuthProvider();

        return (
                <AdminAccessProvider access={access}>
                        <div
                                data-l="LayoutShell"
                                className="AdminLayout grid  bg-slate-950 px-4 py-4 text-slate-100 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6 lg:py-6"
                        >
                                <aside
                                        data-l="SidebarAside"
                                        className="SidebarAside flex flex-col p-5 "
                                >
                                        <AdminNav site={site ?? null} authProvider={authProvider} />
                                </aside>
                                <main className="AdminMain space-y-6 border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/20">{children}</main>
                        </div>
                </AdminAccessProvider>
        );
}