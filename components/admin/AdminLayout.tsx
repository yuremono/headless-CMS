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
                                                ? 'AdminLayout AdminLayoutNoSidebar grid grid-cols-1 px-4 py-4 lg:h-screen lg:px-6 lg:py-6'
                                                : 'AdminLayout grid  px-4 py-4  lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6 lg:py-6 gap-4 lg:gap-6'
                                }
                        >
                                {hideSidebar ? null : (
                                        <aside
                                                data-l="SidebarAside"
                                                className="SidebarAside flex flex-col"
                                        >
                                                <AdminNav site={site ?? null} authProvider={authProvider} readOnly={access.readOnly} />
                                        </aside>
                                )}
                                <main
                                        className={
                                                hideSidebar
                                                        ? 'AdminMain min-h-0 min-w-0 space-y-6 overflow-y-auto'
                                                        : 'AdminMain min-h-0 min-w-0 space-y-6 overflow-y-auto'
                                        }
                                >
                                        {children}
                                </main>
                        </div>
                </AdminAccessProvider>
        );
}
