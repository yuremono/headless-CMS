'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAdminAccess } from './AdminAccessContext';
import { AdminActionNotice } from './AdminActionNotice';
import { adminFetch, type ApiSiteMemberCollection, type ApiSiteMemberRecord } from './admin-api';

const ROLE_OPTIONS = ['owner', 'admin', 'editor', 'viewer'] as const;

interface SiteMembersPanelProps {
  siteId: string;
}

export function SiteMembersPanel({ siteId }: SiteMembersPanelProps) {
  const { canManageMembers } = useAdminAccess();
  const [members, setMembers] = useState<ApiSiteMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<(typeof ROLE_OPTIONS)[number]>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success');

  const refreshMembers = useCallback(async () => {
    setIsLoading(true);
    const result = await adminFetch<ApiSiteMemberCollection>(`/api/admin/sites/${siteId}/members`);

    setIsLoading(false);

    if (!result.ok || !result.data) {
      setMessageKind('error');
      setMessage(result.error ?? 'メンバー一覧の取得に失敗しました。');
      return;
    }

    setMembers(result.data.items);
  }, [siteId]);

  useEffect(() => {
    void refreshMembers();
  }, [refreshMembers]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const result = await adminFetch<ApiSiteMemberRecord>(`/api/admin/sites/${siteId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });

    setIsSubmitting(false);

    if (!result.ok || !result.data) {
      setMessageKind('error');
      setMessage(result.error ?? 'メンバーの招待に失敗しました。');
      return;
    }

    setInviteEmail('');
    setMessageKind('success');
    setMessage(`${result.data.email ?? 'ユーザー'} を招待しました。`);
    await refreshMembers();
  }

  async function handleRoleChange(member: ApiSiteMemberRecord, role: (typeof ROLE_OPTIONS)[number]) {
    if (member.role === role) {
      return;
    }

    setMessage('');
    const result = await adminFetch<ApiSiteMemberRecord>(
      `/api/admin/sites/${siteId}/members/${member.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      },
    );

    if (!result.ok) {
      setMessageKind('error');
      setMessage(result.error ?? 'ロールの更新に失敗しました。');
      return;
    }

    setMessageKind('success');
    setMessage('ロールを更新しました。');
    await refreshMembers();
  }

  async function handleRemove(member: ApiSiteMemberRecord) {
    if (!window.confirm(`${member.email ?? member.userId} をサイトから削除しますか？`)) {
      return;
    }

    setMessage('');
    const result = await adminFetch<null>(`/api/admin/sites/${siteId}/members/${member.id}`, {
      method: 'DELETE',
    });

    if (!result.ok) {
      setMessageKind('error');
      setMessage(result.error ?? 'メンバーの削除に失敗しました。');
      return;
    }

    setMessageKind('success');
    setMessage('メンバーを削除しました。');
    await refreshMembers();
  }

  if (!canManageMembers) {
    return null;
  }

  return (
		<section className="SiteMembersPanel rounded-2xl border border-white/10 bg-slate-950/40 p-4">
			<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 className="text-lg font-semibold text-white">
						サイトメンバー
					</h2>
					<p className="text-sm text-slate-400">
						メールアドレスで招待し、ロールを割り当てます。
					</p>
				</div>
				<p className="text-xs text-slate-500">{members.length} 名</p>
			</div>

			{message ? (
				<div className="mt-4">
					<AdminActionNotice kind={messageKind} message={message} />
				</div>
			) : null}

			<form
				className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
				onSubmit={handleInvite}
			>
				<label className="grid gap-1 text-sm">
					<span className="text-slate-400">メールアドレス</span>
					<input
						type="email"
						required
						value={inviteEmail}
						onChange={(event) => setInviteEmail(event.target.value)}
						className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white"
						placeholder="editor@example.com"
						autoComplete="email"
					/>
				</label>
				<label className="grid gap-1 text-sm">
					<span className="text-slate-400">ロール</span>
					<select
						value={inviteRole}
						onChange={(event) =>
							setInviteRole(
								event.target
									.value as (typeof ROLE_OPTIONS)[number],
							)
						}
						className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white"
					>
						{ROLE_OPTIONS.map((role) => (
							<option key={role} value={role}>
								{role}
							</option>
						))}
					</select>
				</label>
				<button
					type="submit"
					disabled={isSubmitting}
					className="self-end rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
				>
					{isSubmitting ? "招待中…" : "招待"}
				</button>
			</form>

			<div className="mt-4 overflow-x-auto">
				<table className="w-full min-w-[32rem] text-left text-sm">
					<thead>
						<tr className="border-b border-white/10 text-xs uppercase tracking-[0.15em] text-slate-500">
							<th className="px-2 py-2 font-medium">メール</th>
							<th className="px-2 py-2 font-medium">名前</th>
							<th className="px-2 py-2 font-medium">ロール</th>
							<th className="px-2 py-2 font-medium">操作</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td
									colSpan={4}
									className="px-2 py-6 text-slate-400"
								>
									読み込み中…
								</td>
							</tr>
						) : members.length === 0 ? (
							<tr>
								<td
									colSpan={4}
									className="px-2 py-6 text-slate-400"
								>
									メンバーがいません。
								</td>
							</tr>
						) : (
							members.map((member) => (
								<tr
									key={member.id}
									className="border-b border-white/5"
								>
									<td className="px-2 py-3 font-mono text-xs text-slate-200">
										{member.email ?? "—"}
									</td>
									<td className="px-2 py-3 text-slate-300">
										{member.name ?? "—"}
									</td>
									<td className="px-2 py-3">
										<select
											value={member.role}
											onChange={(event) =>
												void handleRoleChange(
													member,
													event.target
														.value as (typeof ROLE_OPTIONS)[number],
												)
											}
											className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-white"
											aria-label={`${member.email ?? member.id} のロール`}
										>
											{ROLE_OPTIONS.map((role) => (
												<option key={role} value={role}>
													{role}
												</option>
											))}
										</select>
									</td>
									<td className="px-2 py-3">
										<button
											type="button"
											onClick={() =>
												void handleRemove(member)
											}
											className="rounded-full border border-AC/30 px-3 py-1 text-xs text-rose-200 hover:bg-AC/10"
										>
											削除
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</section>
  );
}
