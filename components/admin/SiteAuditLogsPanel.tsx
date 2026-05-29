'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAccess } from './AdminAccessContext';
import { AdminActionNotice } from './AdminActionNotice';
import { adminFetch, type ApiAuditLogCollection } from './admin-api';

interface SiteAuditLogsPanelProps {
  siteId: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function SiteAuditLogsPanel({ siteId }: SiteAuditLogsPanelProps) {
  const { canReadAuditLogs } = useAdminAccess();
  const [logs, setLogs] = useState<ApiAuditLogCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const endpoint = `/api/admin/sites/${encodeURIComponent(siteId)}/audit-logs`;

  const refreshLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    const result = await adminFetch<ApiAuditLogCollection>(`${endpoint}?limit=20&offset=0`);

    setIsLoading(false);

    if (!result.ok || !result.data) {
      setErrorMessage(result.error ?? '操作ログの取得に失敗しました。');
      return;
    }

    setLogs(result.data);
  }, [endpoint]);

  useEffect(() => {
    void refreshLogs();
  }, [refreshLogs]);

  if (!canReadAuditLogs) {
    return null;
  }

  return (
    <section className="SiteAuditLogsPanel rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">操作ログ</h2>
          <p className="text-sm text-slate-400">
            直近 20 件を表示します。取得 API:{' '}
            <code className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-slate-300">
              GET {endpoint}
            </code>
          </p>
        </div>
        <p className="text-xs text-slate-500">{logs?.total ?? 0} 件</p>
      </div>

      {errorMessage ? (
        <div className="mt-4">
          <AdminActionNotice kind="error" message={errorMessage} />
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-[0.15em] text-slate-500">
              <th className="px-2 py-2 font-medium">日時</th>
              <th className="px-2 py-2 font-medium">操作</th>
              <th className="px-2 py-2 font-medium">リソース</th>
              <th className="px-2 py-2 font-medium">ID</th>
              <th className="px-2 py-2 font-medium">ユーザー</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-slate-400">
                  読み込み中…
                </td>
              </tr>
            ) : !logs || logs.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-slate-400">
                  操作ログはまだありません。
                </td>
              </tr>
            ) : (
              logs.items.map((log) => (
                <tr key={log.id} className="border-b border-white/5">
                  <td className="px-2 py-3 text-slate-300">{formatDate(log.createdAt)}</td>
                  <td className="px-2 py-3 font-mono text-xs text-slate-200">{log.action}</td>
                  <td className="px-2 py-3 text-slate-300">{log.resource}</td>
                  <td className="px-2 py-3 font-mono text-xs text-slate-400">{log.resourceId ?? '—'}</td>
                  <td className="px-2 py-3 font-mono text-xs text-slate-400">{log.userId ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
