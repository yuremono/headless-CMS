import Link from 'next/link';
import type { ContentRecord, SiteSummary } from './admin-data-types';
import { siteRouteKey } from './admin-data-utils';
import { SiteCreateForm } from './SiteCreateForm';

interface DashboardOverviewProps {
  sites: SiteSummary[];
  recentContents: ContentRecord[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function DashboardOverview({ sites, recentContents }: DashboardOverviewProps) {
  const totalPublished = sites.reduce((sum, site) => sum + site.publishedCount, 0);
  const totalDrafts = sites.reduce((sum, site) => sum + site.draftCount, 0);

  return (
		<section className="DashboardOverview space-y-6">
			<div className="AdminStatGrid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<article className="AdminCard  border border-white/10 bg-white/5 p-5">
					<p className="text-sm text-slate-400">サイト数</p>
					<p className="mt-3 text-3xl font-semibold text-white">
						{sites.length}
					</p>
				</article>
				<article className="AdminCard  border border-white/10 bg-white/5 p-5">
					<p className="text-sm text-slate-400">公開中コンテンツ</p>
					<p className="mt-3 text-3xl font-semibold text-white">
						{totalPublished}
					</p>
				</article>
				<article className="AdminCard  border border-white/10 bg-white/5 p-5">
					<p className="text-sm text-slate-400">下書き</p>
					<p className="mt-3 text-3xl font-semibold text-white">
						{totalDrafts}
					</p>
				</article>
				<article className="AdminCard  border border-white/10 bg-white/5 p-5">
					<p className="text-sm text-slate-400">最新更新</p>
					<p className="mt-3 text-sm font-medium text-white">
						{recentContents[0]
							? formatDate(recentContents[0].updatedAt)
							: "---"}
					</p>
				</article>
			</div>

			<div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
				<section className=" border border-white/10 bg-white/5 p-5">
					<div className="flex items-center justify-between gap-4">
						<div>
							<h3 className="text-lg font-semibold text-white">
								サイト一覧
							</h3>
							<p className="text-sm text-slate-400">
								公開状況と更新状況を一覧で確認できます。
							</p>
						</div>
					</div>
					<div className="mt-4">
						<SiteCreateForm />
					</div>
					<div className="mt-4 space-y-3">
						{sites.map((site) => (
							<article
								key={site.id}
								className="rounded-md border border-white/10 bg-slate-950/50 p-4"
							>
								<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
									<div>
										<h4 className="text-base font-semibold text-white">
											{site.name}
										</h4>
										<p className="text-sm text-slate-400">
											{site.description}
										</p>
										<p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
											{site.domain}
										</p>
									</div>
									<div className="flex gap-3 text-sm text-slate-300">
										<span className="rounded-full border border-white/10 px-3 py-1">
											公開 {site.publishedCount}
										</span>
										<span className="rounded-full border border-white/10 px-3 py-1">
											下書き {site.draftCount}
										</span>
										<span className="rounded-full border border-white/10 px-3 py-1">
											画像 {site.imageUsage}
										</span>
									</div>
								</div>
								<div className="mt-4 flex flex-wrap gap-3">
									<Link
										href={`/sites/${siteRouteKey(site)}`}
										className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950"
									>
										サイト概要
									</Link>
									<Link
										href={`/sites/${siteRouteKey(site)}/content-types`}
										className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white"
									>
										コンテンツ種類
									</Link>
								</div>
							</article>
						))}
					</div>
				</section>

				<section className=" border border-white/10 bg-white/5 p-5">
					<h3 className="text-lg font-semibold text-white">
						最近更新されたコンテンツ
					</h3>
					<div className="mt-4 space-y-3">
						{recentContents.map((content) => (
							<article
								key={content.id}
								className="rounded-md border border-white/10 bg-slate-950/50 p-4"
							>
								<p className="text-sm text-slate-400">
									{content.contentType}
								</p>
								<h4 className="mt-1 text-base font-semibold text-white">
									{content.title}
								</h4>
								<p className="mt-1 text-sm text-slate-300">
									{content.summary}
								</p>
								<div className="mt-3 flex items-center justify-between gap-4 text-xs text-slate-500">
									<span>{content.status}</span>
									<span>{formatDate(content.updatedAt)}</span>
								</div>
							</article>
						))}
					</div>
				</section>
			</div>
		</section>
  );
}
