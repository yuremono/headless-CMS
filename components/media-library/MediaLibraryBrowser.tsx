'use client';

import { useEffect, useState } from 'react';
import { AssetGrid, AssetGridSkeleton } from './AssetGrid';
import { MediaUploadZone, type MediaUploadResult } from './MediaUploadZone';
import { adminFetch, type ApiAssetCollection, type ApiAssetRecord } from './admin-api';
import type { AssetCollection } from './admin-data-types';

interface MediaLibraryBrowserProps {
  siteId: string;
  initialAssets?: AssetCollection;
  allowUpload?: boolean;
  readOnly?: boolean;
  allowDelete?: boolean;
  selectable?: boolean;
  reloadToken?: number;
  onSelect?: (asset: ApiAssetRecord) => void;
  onAssetUpdated?: (asset: ApiAssetRecord) => void;
  onAssetDeleted?: (asset: ApiAssetRecord) => void;
  onAssetsReadyChange?: (ready: boolean) => void;
}

export function MediaLibraryBrowser({
  siteId,
  initialAssets,
  allowUpload = false,
  readOnly = false,
  allowDelete = !readOnly,
  selectable = false,
  reloadToken = 0,
  onSelect,
  onAssetUpdated,
  onAssetDeleted,
  onAssetsReadyChange,
}: MediaLibraryBrowserProps) {
  const [assets, setAssets] = useState<ApiAssetRecord[]>(
    () => initialAssets?.items ?? [],
  );
  const [total, setTotal] = useState(initialAssets?.total ?? 0);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialAssets);

  async function loadAssets(
    showSpinner = false,
    cancelled?: { current: boolean },
  ) {
    if (showSpinner || !initialAssets) {
      setIsLoading(true);
    }

    setMessage('');
    onAssetsReadyChange?.(false);

    const result = await adminFetch<ApiAssetCollection>(
      `/api/admin/sites/${siteId}/assets`,
    );

    if (cancelled?.current) {
      return;
    }

    setIsLoading(false);

    if (!result.ok || !result.data) {
      setMessageKind('error');
      setMessage(result.error ?? 'アセット一覧の取得に失敗しました。');
      onAssetsReadyChange?.(true);
      return;
    }

    setAssets(result.data.items);
    setTotal(result.data.total);
  }

  useEffect(() => {
    if (!message) {
      setNoticeVisible(false);
      return undefined;
    }

    setNoticeVisible(true);
    const timerId = window.setTimeout(() => setNoticeVisible(false), 1500);
    return () => window.clearTimeout(timerId);
  }, [message]);

  useEffect(() => {
    const cancelled = { current: false };

    void (async () => {
      await loadAssets(false, cancelled);
    })();

    return () => {
      cancelled.current = true;
    };
  }, [initialAssets, reloadToken, siteId]);

  function handleBatchComplete(results: MediaUploadResult[]) {
    const uploaded = results.filter((item) => item.asset).map((item) => item.asset!);
    const failedCount = results.length - uploaded.length;

    if (uploaded.length > 0) {
      setAssets((current) => [...uploaded, ...current]);
      setTotal((current) => current + uploaded.length);
      setMessageKind('success');
      setMessage(
        uploaded.length === 1
          ? `${uploaded[0]!.filename} をアップロードしました。`
          : `${uploaded.length} 件のメディアをアップロードしました。`,
      );
      return;
    }

    if (failedCount > 0) {
      setMessageKind('error');
      setMessage(results[0]?.error ?? 'アップロードに失敗しました。');
    }
  }

  function handleAssetUpdated(updated: ApiAssetRecord) {
    setAssets((current) =>
      current.map((asset) => (asset.id === updated.id ? updated : asset)),
    );
    setMessageKind('success');
    setMessage('代替テキストを保存しました。');
    onAssetUpdated?.(updated);
  }

  function handleAssetDeleted(deleted: ApiAssetRecord) {
    setAssets((current) => current.filter((asset) => asset.id !== deleted.id));
    setTotal((current) => Math.max(current - 1, 0));
    setMessageKind('success');
    setMessage(`${deleted.filename} を削除しました。`);
    onAssetDeleted?.(deleted);
  }

  return (
    <div className="space-y-6">
      {message && noticeVisible ? (
        <p
          className={`font-bold text-sm ${
            messageKind === 'success' ? 'text-SC' : 'text-AC'
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      {/* MediaLibraryBrowser_toolbar */}
      {/* アセット数 {total} */}

      {allowUpload && !readOnly ? (
        <MediaUploadZone
          siteId={siteId}
          buttonLabel="画像・動画をアップロード"
          dropHint="画像または動画をドラッグ&ドロップ、またはクリックして選択（複数可）"
          onBatchComplete={handleBatchComplete}
        />
      ) : null}

      {isLoading ? (
        <div role="status" aria-label="メディアを読み込み中">
          <AssetGridSkeleton />
        </div>
      ) : (
        <AssetGrid
          siteId={siteId}
          assets={assets}
          selectable={selectable}
          onSelect={onSelect}
          onAssetUpdated={handleAssetUpdated}
          onAssetDeleted={handleAssetDeleted}
          onAssetsReadyChange={onAssetsReadyChange}
          readOnly={readOnly}
          allowDelete={allowDelete}
        />
      )}
    </div>
  );
}
