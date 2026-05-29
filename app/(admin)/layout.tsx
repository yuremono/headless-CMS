import type { ReactNode } from 'react';

/** Vercel ビルド時に DB へ接続しない（runtime のみ DB 使用） */
export const dynamic = 'force-dynamic';

export default function AdminGroupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
