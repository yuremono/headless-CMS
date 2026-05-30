'use client';

import { useState } from 'react';
import { useAdminAccess } from './AdminAccessContext';
import { AdminActionNotice } from './AdminActionNotice';
import { adminFetch } from './admin-api';

export interface ApiRotateKeysResponse {
  apiKeys: {
    public: string;
    admin: string;
  };
}

interface SiteApiKeyRotatePanelProps {
  siteId: string;
  siteName: string;
}

export function SiteApiKeyRotatePanel({ siteId, siteName }: SiteApiKeyRotatePanelProps) {
  const { canRotateApiKeys } = useAdminAccess();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rotatedKeys, setRotatedKeys] = useState<ApiRotateKeysResponse | null>(null);

  async function handleRotate() {
    const confirmed = window.confirm(
      `「${siteName}」の公開・管理 API キーを再発行します。旧キーは直ちに無効になります。続行しますか？`,
    );
    if (!confirmed) {
      return;
    }

    setErrorMessage('');
    setRotatedKeys(null);
    setIsSubmitting(true);

    const result = await adminFetch<ApiRotateKeysResponse>(
      `/api/admin/sites/${encodeURIComponent(siteId)}/api-keys/rotate`,
      { method: 'POST' },
    );

    setIsSubmitting(false);

    if (!result.ok || !result.data) {
      setErrorMessage(result.error ?? 'API キーの再発行に失敗しました。');
      return;
    }

    setRotatedKeys(result.data);
  }

  if (!canRotateApiKeys) {
    return null;
  }

  if (rotatedKeys) {
    return (
		<section className="SiteApiKeyRotatePanel rounded-md border border-amber-400/20 bg-amber-400/5 p-4">
			<AdminActionNotice
				kind="success"
				message="新しい API キーを発行しました。この画面を離れると再表示できません。"
			/>
			<dl className="mt-4 grid gap-3 text-sm">
				<div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
					<dt className="text-xs uppercase tracking-[0.2em] text-slate-500">
						公開 API キー
					</dt>
					<dd className="mt-1 break-all font-mono text-amber-100">
						{rotatedKeys.apiKeys.public}
					</dd>
				</div>
				<div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
					<dt className="text-xs uppercase tracking-[0.2em] text-slate-500">
						管理 API キー
					</dt>
					<dd className="mt-1 break-all font-mono text-amber-100">
						{rotatedKeys.apiKeys.admin}
					</dd>
				</div>
			</dl>
			<button
				type="button"
				className="mt-4 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white"
				onClick={() => setRotatedKeys(null)}
			>
				閉じる
			</button>
		</section>
	);
  }

  return (
		<section className="SiteApiKeyRotatePanel rounded-md border border-white/10 bg-slate-950/50 p-4">
			<h3 className="text-base font-semibold text-white">API キー</h3>
			<p className="mt-2 text-sm leading-6 text-slate-400">
				公開・管理キーをまとめて再発行します。再発行後は旧キーで API
				にアクセスできません。
			</p>
			<button
				type="button"
				disabled={isSubmitting}
				className="mt-4 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
				onClick={() => void handleRotate()}
			>
				{isSubmitting ? "再発行中…" : "API キーを再発行"}
			</button>
			{errorMessage ? (
				<div className="mt-3">
					<AdminActionNotice kind="error" message={errorMessage} />
				</div>
			) : null}
		</section>
  );
}
