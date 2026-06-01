import Link from 'next/link';
import type { CmsAuthProvider } from '@/lib/auth/production-config';
import type { SiteSummary } from './admin-data-types';
import { siteRouteKey } from './admin-data-utils';
import { LogoutButton } from './LogoutButton';

interface AdminNavProps {
  site?: SiteSummary | null;
  authProvider?: CmsAuthProvider;
  readOnly?: boolean;
}

export function AdminNav({ site, authProvider = 'none', readOnly = false }: AdminNavProps) {
  const siteKey = site ? siteRouteKey(site) : '';
  const navItems = [
    { href: '/', label: 'トップページ' },
    { href: '/dashboard', label: 'ダッシュボード' },
  ];
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
		<nav className="AdminNav flex h-full flex-col gap-6">
			<div data-l="NavBrand">
				<h1 className="text-lg font-normal pt-1">
					Composable ( Headless ) CMS
					<span className="block opacity-50 [font-size:0.75em]">
						inspired by microCMS.
					</span>
				</h1>
				<p className="mt-2 text-sm text-GR">
					{readOnly
						? "閲覧専用です。フィールドの追加・編集はできません。"
						: "フィールドを追加・保存し、サイトやアプリで取得します。"}
				</p>
			</div>
			<div data-l="NavMain" className="space-y-2">
				<p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
					Directory
				</p>
				<ul className="">
					{navItems.map((item) => (
						<li key={item.href}>
							<Link
								href={item.href}
								className="block rounded-md p-2 text-sm transition"
							>
								{item.label}
							</Link>
						</li>
					))}
				</ul>
			</div>

			{/* {siteItems.length > 0 ? (
				<div data-l="NavSite" className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
						Site tools
					</p>
					<ul className="space-y-1">
						{siteItems.map((item) => (
							<li key={item.href}>
								<Link
									href={item.href}
									className="block rounded-md px-3 py-2 text-sm transition"
								>
									{item.label}
								</Link>
							</li>
						))}
					</ul>
				</div>
			) : null} */}

			<div
				data-l=""
				className="mt-auto space-y-2 border-t border-TC/10 pt-5"
			>
				<p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
					Account
				</p>
				<LogoutButton authProvider={authProvider} />
			</div>
		</nav>
  );
}
