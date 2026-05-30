import Link from 'next/link';
import type { CmsAuthProvider } from '@/lib/auth/production-config';
import type { SiteSummary } from './admin-data-types';
import { siteRouteKey } from './admin-data-utils';
import { LogoutButton } from './LogoutButton';

interface AdminNavProps {
  site?: SiteSummary | null;
  authProvider?: CmsAuthProvider;
}

export function AdminNav({ site, authProvider = 'none' }: AdminNavProps) {
  const siteKey = site ? siteRouteKey(site) : '';
  const navItems = site
    ? [
        { href: `/sites/${siteKey}/developer`, label: '開発者用' },
        { href: '/', label: 'ダッシュボード' },
      ]
    : [{ href: '/', label: 'ダッシュボード' }];
  const siteItems = site
    ? [
        { href: `/sites/${siteKey}`, label: 'サイト概要' },
        { href: `/sites/${siteKey}/contents`, label: 'コンテンツ一覧' },
        { href: `/sites/${siteKey}/media`, label: 'メディア' },
        { href: `/sites/${siteKey}/content-types`, label: 'コンテンツ種類' },
        { href: `/sites/${siteKey}/contents/page`, label: '固定ページ一覧' },
        { href: `/sites/${siteKey}/contents/news`, label: 'お知らせ一覧' },
      ]
    : [];

  return (
    <nav className="AdminNav flex min-h-full flex-col gap-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Headless CMS</p>
        <h1 className="text-xl font-semibold text-white">管理画面</h1>
        {/* <p className="text-sm leading-6 text-slate-300">
          スキーマ駆動の編集 UI をまとめています。
        </p> */}
      </div>

      {/* {site ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current site</p>
          <p className="mt-2 text-lg font-semibold text-white">{site.name}</p>
          <p className="text-sm text-slate-300">{site.domain}</p>
        </div>
      ) : null} */}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Navigation</p>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {siteItems.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Site tools</p>
          <ul className="space-y-1">
            {siteItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-auto space-y-2 border-t border-white/10 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Account</p>
        <LogoutButton authProvider={authProvider} />
      </div>
    </nav>
  );
}
