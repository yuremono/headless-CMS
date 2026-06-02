'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { AdminUiAccess } from '@/lib/auth/admin-ui-access';

const defaultAccess: AdminUiAccess = {
  enforceRoles: false,
  siteRole: 'owner',
  readOnly: false,
  canManageSite: true,
  canRotateApiKeys: true,
  canManageMembers: true,
  canReadAuditLogs: true,
};

const AdminAccessContext = createContext<AdminUiAccess>(defaultAccess);

interface AdminAccessProviderProps {
  access: AdminUiAccess;
  children: ReactNode;
}

export function AdminAccessProvider({ access, children }: AdminAccessProviderProps) {
  return <AdminAccessContext.Provider value={access}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess(): AdminUiAccess {
  return useContext(AdminAccessContext);
}
