import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
		<header className="AdminPageHeader flex flex-col gap-4  border border-white/10 bg-white/5 p-6 shadow-xl shadow-slate-950/20 lg:flex-row lg:items-end lg:justify-between">
			<div data-l="PageTitle" className="space-y-2">
				<h2 className="text-3xl font-semibold tracking-tight text-white">
					{title}
				</h2>
			</div>
			{actions ? (
				<div data-l="PageActions" className="flex flex-wrap gap-3">{actions}</div>
			) : null}
		</header>
  );
}
