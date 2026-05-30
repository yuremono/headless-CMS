'use client';

import { useState } from 'react';
import { useAdminAccess } from './AdminAccessContext';
import { AdminActionNotice } from './AdminActionNotice';
import { adminFetch, type ApiAssetCollection, type ApiAssetRecord } from './admin-api';
import { AssetGrid } from './AssetGrid';
import { MediaUploadZone, type MediaUploadResult } from './MediaUploadZone';
import type { AssetCollection } from './admin-data-types';

interface MediaLibraryProps {
  siteId: string;
  initialAssets: AssetCollection;
}

export function MediaLibrary({ siteId, initialAssets }: MediaLibraryProps) {
  const { readOnly } = useAdminAccess();
  const [assets, setAssets] = useState<ApiAssetRecord[]>(initialAssets.items);
  const [total, setTotal] = useState(initialAssets.total);
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

  function handleBatchComplete(results: MediaUploadResult[]) {
    const uploaded = results.filter((item) => item.asset).map((item) => item.asset!);
    const failedCount = results.length - uploaded.length;

    if (uploaded.length > 0) {
      setAssets((current) => [...uploaded, ...current]);
      setTotal((current) => current + uploaded.length);
    }

    if (failedCount === 0 && uploaded.length > 0) {
      setMessageKind('success');
      setMessage(
        uploaded.length === 1
          ? `${uploaded[0]!.filename} をアップロードしました。`
          : `${uploaded.length} 件のメディアをアップロードしました。`,
      );
      return;
    }

    if (failedCount > 0 && uploaded.length > 0) {
      setMessageKind('error');
      setMessage(`${uploaded.length} 件成功、${failedCount} 件失敗しました。`);
      return;
    }

    if (failedCount > 0) {
      setMessageKind('error');
      setMessage(results[0]?.error ?? 'アップロードに失敗しました。');
    }
  }

  function handleAssetUpdated(updated: ApiAssetRecord) {
    setAssets((current) => current.map((asset) => (asset.id === updated.id ? updated : asset)));
    setMessageKind('success');
    setMessage('代替テキストを保存しました。');
  }

  return (
    <div className="MediaLibrary space-y-6">
      <AdminActionNotice kind={messageKind} message={message} />

      <div className="MediaLibrary_toolbar flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-white/5 p-5">
        <div>
          <p className="text-sm font-medium text-white">アセット数</p>
          <p className="mt-1 text-2xl font-semibold text-white">{total}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

      {!readOnly ? (
        <MediaUploadZone
          siteId={siteId}
          buttonLabel="画像・動画をアップロード"
          dropHint="画像または動画をドラッグ&ドロップ、またはクリックして選択（複数可）"
          onBatchComplete={handleBatchComplete}
        />
      ) : null}

      <AssetGrid siteId={siteId} assets={assets} onAssetUpdated={handleAssetUpdated} readOnly={readOnly} />
    </div>
  );
}
