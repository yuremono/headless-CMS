'use client';

import { useRef, useState } from 'react';
import { useAdminAccess } from './AdminAccessContext';
import { AdminActionNotice } from './AdminActionNotice';
import { adminFetch, type ApiAssetCollection, type ApiAssetRecord } from './admin-api';
import { AssetGrid } from './AssetGrid';
import type { AssetCollection } from './admin-data-types';

interface MediaLibraryProps {
  siteId: string;
  initialAssets: AssetCollection;
}

export function MediaLibrary({ siteId, initialAssets }: MediaLibraryProps) {
  const { readOnly } = useAdminAccess();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<ApiAssetRecord[]>(initialAssets.items);
  const [total, setTotal] = useState(initialAssets.total);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success');

  async function refreshAssets() {
    const result = await adminFetch<ApiAssetCollection>(`/api/admin/sites/${siteId}/assets`);

    if (!result.ok || !result.data) {
      setMessageKind('error');
      setMessage(result.error ?? 'アセット一覧の取得に失敗しました。');
      return;
    }

    setAssets(result.data.items);
    setTotal(result.data.total);
  }

  async function handleFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    const result = await adminFetch<ApiAssetRecord>(`/api/admin/sites/${siteId}/assets`, {
      method: 'POST',
      body: formData,
    });

    setIsUploading(false);

    if (!result.ok || !result.data) {
      setMessageKind('error');
      setMessage(result.error ?? 'アップロードに失敗しました。');
      return;
    }

    setAssets((current) => [result.data!, ...current]);
    setTotal((current) => current + 1);
    setMessageKind('success');
    setMessage(`${result.data.filename} をアップロードしました。`);
  }

  function handleAssetUpdated(updated: ApiAssetRecord) {
    setAssets((current) => current.map((asset) => (asset.id === updated.id ? updated : asset)));
    setMessageKind('success');
    setMessage('代替テキストを保存しました。');
  }

  return (
    <div className="MediaLibrary space-y-6">
      <AdminActionNotice kind={messageKind} message={message} />

      <div className="MediaLibrary_toolbar flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
        <div>
          <p className="text-sm font-medium text-white">アセット数</p>
          <p className="mt-1 text-2xl font-semibold text-white">{total}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!readOnly ? (
            <>
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleFileSelected(file);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'アップロード中…' : '画像をアップロード'}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            onClick={() => {
              void refreshAssets();
            }}
          >
            一覧を更新
          </button>
        </div>
      </div>

      <AssetGrid siteId={siteId} assets={assets} onAssetUpdated={handleAssetUpdated} readOnly={readOnly} />
    </div>
  );
}
