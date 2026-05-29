'use client';

import { useState } from 'react';
import { AdminActionNotice } from './AdminActionNotice';
import { adminFetch } from './admin-api';
import type { SiteExportPayload } from '@/lib/db/site-export';

interface SiteExportPanelProps {
  siteId: string;
  siteSlug: string;
}

function downloadJson(filename: string, payload: SiteExportPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function SiteExportPanel({ siteId, siteSlug }: SiteExportPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleExport() {
    setErrorMessage('');
    setIsSubmitting(true);

    const result = await adminFetch<SiteExportPayload>(
      `/api/admin/sites/${encodeURIComponent(siteId)}/export`,
    );

    setIsSubmitting(false);

    if (!result.ok || !result.data) {
      setErrorMessage(result.error ?? 'サイトのエクスポートに失敗しました。');
      return;
    }

    const stamp = result.data.exportedAt.slice(0, 10);
    downloadJson(`${siteSlug}-export-${stamp}.json`, result.data);
  }

  return (
    <section className="SiteExportPanel rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <h3 className="text-base font-semibold text-white">サイトエクスポート</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        コンテンツ種類・コンテンツ・アセットメタデータ（URL のみ）を JSON でダウンロードします。画像バイナリは含みません。
      </p>
      <button
        type="button"
        disabled={isSubmitting}
        className="mt-4 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => void handleExport()}
      >
        {isSubmitting ? 'エクスポート中…' : 'エクスポート'}
      </button>
      {errorMessage ? (
        <div className="mt-3">
          <AdminActionNotice kind="error" message={errorMessage} />
        </div>
      ) : null}
    </section>
  );
}
