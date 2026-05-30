'use client';

import { useRouter } from 'next/navigation';
import type { CmsAuthProvider } from '../../lib/auth/production-config';
import { adminFetch, clearAdminSession, resolveClientSessionToken } from './admin-api';
import { adminBtnDangerSm } from './admin-ui-classes';

interface LogoutButtonProps {
  className?: string;
  authProvider?: CmsAuthProvider;
}

export function LogoutButton({
  className,
  authProvider = 'none',
}: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    if (authProvider === "authjs") {
      const token = resolveClientSessionToken();
      await adminFetch("/api/admin/auth/logout", {
        method: "POST",
        headers: token ? { "x-session-token": token } : {},
      });
    }

    clearAdminSession();
    router.replace("/login");
  }

  return (
    <button
      type="button"
      className={`w-full ${className ?? adminBtnDangerSm}`}
      onClick={handleLogout}
      aria-label="ログアウト"
    >
      ログアウト
    </button>
  );
}
