'use client';

import { useRouter } from 'next/navigation';
import type { CmsAuthProvider } from '../../lib/auth/production-config';
import { adminFetch, clearAdminSession, resolveClientSessionToken } from './admin-api';

interface LogoutButtonProps {
  className?: string;
  authProvider?: CmsAuthProvider;
}

export function LogoutButton({
  className = 'w-full rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-white',
  authProvider = 'none',
}: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    if (authProvider === 'authjs') {
      const token = resolveClientSessionToken();
      await adminFetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: token ? { 'x-session-token': token } : {},
      });
    }

    clearAdminSession();
    router.replace('/login');
  }

  return (
    <button
      type="button"
      className={`LogoutButton ${className}`}
      onClick={handleLogout}
      aria-label="ログアウト"
    >
      ログアウト
    </button>
  );
}
