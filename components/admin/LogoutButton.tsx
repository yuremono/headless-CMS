'use client';

import { useRouter } from 'next/navigation';
import { clearAdminSession } from './admin-api';

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({
  className = 'w-full rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-white',
}: LogoutButtonProps) {
  const router = useRouter();

  function handleLogout() {
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
