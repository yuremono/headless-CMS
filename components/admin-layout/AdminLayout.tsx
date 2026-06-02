import type {
        ReactNode
}

from 'react';

import {
  getAdminUiAccess
}

from '@/lib/auth/admin-ui-access';

import {
        AdminAccessProvider
}

from '@/components/admin-layout/AdminAccessContext';

import type {
  SiteSummary
}

from '@/components/admin-data/admin-data-types';

import {
        siteRouteKey
}

from '@/components/admin-data/admin-data-utils';

interface AdminLayoutProps {
        children: ReactNode;
        site?: SiteSummary | null;
        title?: string;
        hideSidebar?: boolean;
}

export async function AdminLayout( {
  children, site
        }

        : AdminLayoutProps) {
  const siteKey=site ? siteRouteKey(site): undefined;
  const access=await getAdminUiAccess(siteKey);

  return (
<AdminAccessProvider access={access}>
                        <div
                                data-l="LayoutShell"
                                className="AdminLayout AdminLayoutNoSidebar grid grid-cols-1 px-4 py-4 lg:h-screen lg:px-6 lg:py-6"
                        >
                                <main
                                        className="AdminMain min-h-0 min-w-0 space-y-6 overflow-y-auto"
                                >
                                        {children}
                                </main>
                        </div>
                </AdminAccessProvider>
        );
}
