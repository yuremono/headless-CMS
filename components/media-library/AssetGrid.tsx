'use client';

import { X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { adminDeleteIconButton } from '@/components/admin-layout/admin-ui-classes';
import { adminFetch, type ApiAssetRecord } from '@/components/admin-data/admin-api';

interface AssetGridProps {
  siteId: string;
  assets: ApiAssetRecord[];
  selectable?: boolean;
  selectedUrl?: string;
  onSelect?: (asset: ApiAssetRecord) => void;
  onAssetUpdated?: (asset: ApiAssetRecord) => void;
  onAssetDeleted?: (asset: ApiAssetRecord) => void;
  onAssetsReadyChange?: (ready: boolean) => void;
  readOnly?: boolean;
  allowDelete?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDimensions(width: number | null, height: number | null): string {
  if (!width || !height) {
    return '—';
  }

  return `${width} × ${height}`;
}

export function AssetGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul
      className="AssetGrid grid min-h-[520px] gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <li
          key={index}
          className="AssetGrid_item overflow-hidden border border-WH/0"
        >
          <div className="AssetGrid_preview relative aspect-[4/3] overflow-hidden bg-GR/80">
            <div className="h-full w-full animate-pulse bg-WH/20" />
          </div>
          <div className="AssetGrid_meta space-y-3 p-4">
            <div className="h-4 w-2/5 animate-pulse rounded bg-GR/30" />
            <div className="h-3 w-full animate-pulse rounded bg-GR/20" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-9 animate-pulse rounded bg-GR/20" />
              <div className="h-9 animate-pulse rounded bg-GR/20" />
            </div>
            <div className="h-11 animate-pulse rounded-full bg-GR/20" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AssetGrid({
  siteId,
  assets,
  selectable = false,
  selectedUrl,
  onSelect,
  onAssetUpdated,
  onAssetDeleted,
  onAssetsReadyChange,
  readOnly = false,
  allowDelete = !readOnly,
}: AssetGridProps) {
  const [draftAlts, setDraftAlts] = useState<Record<string, string>>(() =>
    Object.fromEntries(assets.map((asset) => [asset.id, asset.alt ?? ''])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingAssetDelete, setPendingAssetDelete] = useState<ApiAssetRecord | null>(null);
  const [loadedAssetIds, setLoadedAssetIds] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const previewAssets = assets.filter(
      (asset) =>
        asset.mimeType.startsWith("image/") ||
        asset.mimeType.startsWith("video/"),
    );
    const isReady =
      previewAssets.length === 0 ||
      previewAssets.every((asset) => loadedAssetIds[asset.id]);

    onAssetsReadyChange?.(isReady);
  }, [assets, loadedAssetIds, onAssetsReadyChange]);

  async function saveAlt(asset: ApiAssetRecord) {
    const nextAlt = draftAlts[asset.id] ?? '';
    if (nextAlt === (asset.alt ?? '')) {
      return;
    }

    setSavingId(asset.id);
    setErrors((current) => {
      const next = { ...current };
      delete next[asset.id];
      return next;
    });

    const result = await adminFetch<ApiAssetRecord>(`/api/admin/sites/${siteId}/assets/${asset.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ alt: nextAlt }),
    });

    setSavingId(null);

    if (!result.ok || !result.data) {
      setErrors((current) => ({
        ...current,
        [asset.id]: result.error ?? '代替テキストの保存に失敗しました。',
      }));
      return;
    }

    onAssetUpdated?.(result.data);
  }

  async function deleteAsset(asset: ApiAssetRecord) {
    setDeletingId(asset.id);
    setErrors((current) => {
      const next = { ...current };
      delete next[asset.id];
      return next;
    });

    const result = await adminFetch<{ ok: boolean }>(`/api/admin/sites/${siteId}/assets/${asset.id}`, {
      method: 'DELETE',
    });

    setDeletingId(null);

    if (!result.ok) {
      setErrors((current) => ({
        ...current,
        [asset.id]: result.error ?? 'アセットの削除に失敗しました。',
      }));
      return;
    }

    setPendingAssetDelete(null);
    onAssetDeleted?.(asset);
  }

  if (assets.length === 0) {
    return (
		<div className="AssetGrid  border border-dashed border-WH/15 bg-GR/30 p-10 text-center text-sm text-GR">
			アップロード済みのアセットはまだありません。
		</div>
	);
  }

  return (
		<>
			<ul className="AssetGrid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{assets.map((asset) => {
					const isSelected = selectable && selectedUrl === asset.url;
					const isSaving = savingId === asset.id;
					const isDeleting = deletingId === asset.id;

        return (
			<li
				key={asset.id}
				className={`AssetGrid_item overflow-hidden  border  ${
					isSelected
						? "border-SC/60 ring-1 ring-SC/20"
						: "border-WH/0"
				}`}
			>
				<div className="AssetGrid_preview relative aspect-[4/3] overflow-hidden bg-GR/80">
					{asset.mimeType.startsWith("image/") ? (
						<img
							src={asset.url}
							alt={asset.alt ?? asset.filename}
							className="h-full w-full object-contain"
							onLoad={() =>
								setLoadedAssetIds((current) => ({
									...current,
									[asset.id]: true,
								}))
							}
							onError={() =>
								setLoadedAssetIds((current) => ({
									...current,
									[asset.id]: true,
								}))
							}
						/>
					) : asset.mimeType.startsWith("video/") ? (
						<video
							src={asset.url}
							className="h-full w-full object-contain"
							controls
							preload="metadata"
							aria-label={asset.alt ?? asset.filename}
							onLoadedMetadata={() =>
								setLoadedAssetIds((current) => ({
									...current,
									[asset.id]: true,
								}))
							}
							onError={() =>
								setLoadedAssetIds((current) => ({
									...current,
									[asset.id]: true,
								}))
							}
						/>
					) : (
						<div className="flex h-full items-center justify-center text-sm text-GR">
							{asset.mimeType}
						</div>
					)}

					{selectable ? (
						<button
							type="button"
							className="absolute inset-0  transition "
							aria-label={`${asset.filename} を選択`}
							onClick={() => onSelect?.(asset)}
						/>
					) : null}
					{allowDelete ? (
									<button
										type="button"
										className={`absolute right-2 top-2 z-10 ${adminDeleteIconButton} disabled:cursor-not-allowed disabled:opacity-60`}
										onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								setPendingAssetDelete(asset);
							}}
							disabled={isDeleting}
							aria-label={`${asset.filename} を削除`}
							title="画像を削除"
						>
							<X
								size={16}
								aria-hidden="true"
								weight="bold"
							/>
						</button>
					) : null}
				</div>

				<div className="AssetGrid_meta space-y-3 p-4">
					<div>
						<p
							className="truncate text-sm font-medium "
							title={asset.filename}
						>
							{asset.filename}
						</p>
						<p
							className="mt-1 truncate text-xs "
							title={asset.url}
						>
							{asset.url}
						</p>
					</div>

					<dl className="grid grid-cols-2 gap-2 text-xs ">
						<div>
							<dt className="">MIME</dt>
							<dd className="mt-0.5 truncate">
								{asset.mimeType}
							</dd>
						</div>
						<div>
							<dt className="">サイズ</dt>
							<dd className="mt-0.5">
								{formatFileSize(asset.size)}
							</dd>
						</div>
						<div className="col-span-2">
							<dt className="">寸法</dt>
							<dd className="mt-0.5">
								{formatDimensions(asset.width, asset.height)}
							</dd>
						</div>
					</dl>

					{selectable ? (
						<>
							<button
								type="button"
								className="w-full rounded-full border  px-4 py-2 text-sm font-medium transition "
								onClick={() => onSelect?.(asset)}
							>
								この画像を使う
							</button>
						</>
					) : readOnly ? (
						null
					) : (
						<>
							<label className="block">
								<span className="text-xs font-medium text-GR">
									代替テキスト
								</span>
								<input
									className="mt-2 w-full rounded-2xl border border-WH/10 bg-GR/70 px-3 py-2 text-sm outline-none transition placeholder: focus:border-SC/60 focus:ring-2 focus:ring-SC/20"
									type="text"
									value={draftAlts[asset.id] ?? ""}
									placeholder="画像の説明"
									onChange={(event) =>
										setDraftAlts((current) => ({
											...current,
											[asset.id]: event.target.value,
										}))
									}
									onBlur={() => {
										void saveAlt(asset);
									}}
								/>
							</label>
							<button
								type="button"
								className="rounded-full border border-WH/15 px-4 py-2 text-sm font-medium transition hover:bg-WH/10 disabled:cursor-not-allowed disabled:opacity-60"
								disabled={
									isSaving ||
									(draftAlts[asset.id] ?? "") ===
										(asset.alt ?? "")
								}
								onClick={() => {
									void saveAlt(asset);
								}}
							>
								{isSaving ? "保存中…" : "代替テキストを保存"}
							</button>
						</>
					)}

					{errors[asset.id] ? (
						<p className="text-xs text-rose-300">
							{errors[asset.id]}
						</p>
					) : null}
				</div>
			</li>
		);
				})}
			</ul>
			{pendingAssetDelete ? (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-TC/30 p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="AssetDeleteDialogTitle"
				>
					<div className="w-full max-w-sm rounded-md border border-TC/20 bg-WH p-5 shadow-xl">
						<h2
							id="AssetDeleteDialogTitle"
							className="text-base font-bold text-TC"
						>
							画像を削除しますか？
						</h2>
						<p className="mt-2 text-sm text-GR">
							{pendingAssetDelete.filename} を削除します。この操作は取り消せません。
						</p>
						{errors[pendingAssetDelete.id] ? (
							<p className="mt-3 text-xs text-rose-300">
								{errors[pendingAssetDelete.id]}
							</p>
						) : null}
						<div className="mt-5 flex justify-end gap-2">
							<button
								type="button"
								className="rounded-md border border-TC/20 px-3 py-2 text-sm text-TC transition hover:bg-TC/5"
								onClick={() => setPendingAssetDelete(null)}
								disabled={deletingId === pendingAssetDelete.id}
							>
								キャンセル
							</button>
							<button
								type="button"
								className="inline-flex items-center gap-1 rounded-md border border-AC/40 bg-AC px-3 py-2 text-sm font-bold text-WH transition hover:bg-AC/80 disabled:cursor-not-allowed disabled:opacity-60"
								autoFocus
								onClick={() => {
									void deleteAsset(pendingAssetDelete);
								}}
								disabled={deletingId === pendingAssetDelete.id}
							>
								{deletingId === pendingAssetDelete.id ? "削除中…" : "削除"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</>
  );
}
