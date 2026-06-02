'use client';

import { useRouter } from 'next/navigation';
import type { CmsAuthProvider } from '@/lib/auth/production-config';
import { adminFetch, clearAdminSession, resolveClientSessionToken } from '@/components/admin-data/admin-api';
import { adminBtnLg } from '@/components/admin-layout/admin-ui-classes';

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
      className={`font-bold w-full py-3 bg-WH border border-TC/20 hover:bg-SC/10 transition`}
      onClick={handleLogout}
      aria-label="Log Out"
    >
      Log Out
    </button>
  );
}
