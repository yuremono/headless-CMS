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
        hideSidebar?: boolean;
}

export async function AdminLayout( {
                children, site, hideSidebar = false
        }

        : AdminLayoutProps) {
        const siteKey=site ? siteRouteKey(site): undefined;
        const access=await getAdminUiAccess(siteKey);
        const authProvider=getAuthProvider();

        return (
                <AdminAccessProvider access={access}>
                        <div
                                data-l="LayoutShell"
                                className={
                                        hideSidebar
                                                ? 'AdminLayout AdminLayout--no_sidebar grid bg-BC px-4 py-4 text-WH lg:px-6 lg:py-6'
                                                : 'AdminLayout grid bg-BC px-4 py-4 text-WH lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6 lg:py-6'
                                }
                        >
                                {hideSidebar ? null : (
                                        <aside
                                                data-l="SidebarAside"
                                                className="SidebarAside flex flex-col p-5 "
                                        >
                                                <AdminNav site={site ?? null} authProvider={authProvider} />
                                        </aside>
                                )}
                                <main
                                        className={
                                                hideSidebar
                                                        ? 'AdminMain AdminMain--full space-y-6 border border-WH/10 bg-WH/5 p-5 shadow-xl shadow-BC/20'
                                                        : 'AdminMain space-y-6 border border-WH/10 bg-WH/5 p-5 shadow-xl shadow-BC/20'
                                        }
                                >
                                        {children}
                                </main>
                        </div>
                </AdminAccessProvider>
        );
}