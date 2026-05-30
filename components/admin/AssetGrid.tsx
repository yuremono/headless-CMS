'use client';

import { useState } from 'react';
import { adminFetch, type ApiAssetRecord } from './admin-api';
import { adminBtnGhostSm, adminFieldControlCompact } from "./admin-ui-classes";

interface AssetGridProps {
  siteId: string;
  assets: ApiAssetRecord[];
  selectable?: boolean;
  selectedUrl?: string;
  onSelect?: (asset: ApiAssetRecord) => void;
  onAssetUpdated?: (asset: ApiAssetRecord) => void;
  readOnly?: boolean;
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

export function AssetGrid({
  siteId,
  assets,
  selectable = false,
  selectedUrl,
  onSelect,
  onAssetUpdated,
  readOnly = false,
}: AssetGridProps) {
  const [draftAlts, setDraftAlts] = useState<Record<string, string>>(() =>
    Object.fromEntries(assets.map((asset) => [asset.id, asset.alt ?? ''])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  if (assets.length === 0) {
    return (
		<div
			data-l="AssetEmpty"
			className="AssetGrid border border-dashed border-WH/35 bg-BC/40 p-10 text-center text-sm text-GR"
		>
			アップロード済みのアセットはまだありません。
		</div>
	);
  }

  return (
    <ul className="AssetGrid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset, assetIndex) => {
        const isSelected = selectable && selectedUrl === asset.url;
        const isSaving = savingId === asset.id;
        const itemLabel = `ItemPreview${assetIndex + 1}`;
        const metaLabel = `ItemMeta${assetIndex + 1}`;

        return (
			<li
				key={asset.id}
				className={`AssetGrid_item overflow-hidden  border bg-BK/50 ${
					isSelected
						? "border-SC/60 ring-2 ring-SC/20"
						: "border-WH/20"
				}`}
			>
				<div
					data-l={itemLabel}
					className="AssetGrid_preview relative aspect-[4/3] overflow-hidden bg-BK/80"
				>
					{asset.mimeType.startsWith("image/") ? (
						<img
							src={asset.url}
							alt={asset.alt ?? asset.filename}
							className="h-full w-full object-cover"
						/>
					) : asset.mimeType.startsWith("video/") ? (
						<video
							src={asset.url}
							className="h-full w-full object-cover"
							controls
							preload="metadata"
							aria-label={asset.alt ?? asset.filename}
						/>
					) : (
						<div
							data-l="MimeFallback"
							className="flex h-full items-center justify-center text-sm text-GR"
						>
							{asset.mimeType}
						</div>
					)}

					{selectable ? (
						<button
							type="button"
							className="absolute inset-0 bg-BK/0 transition hover:bg-BK/20"
							aria-label={`${asset.filename} を選択`}
							onClick={() => onSelect?.(asset)}
						/>
					) : null}
				</div>

				<div
					data-l={metaLabel}
					className="AssetGrid_meta space-y-3 p-4"
				>
					<div>
						<p
							className="truncate text-sm font-medium text-WH"
							title={asset.filename}
						>
							{asset.filename}
						</p>
						<p
							className="mt-1 truncate text-xs text-GR"
							title={asset.url}
						>
							{asset.url}
						</p>
					</div>

					<dl className="grid grid-cols-2 gap-2 text-xs text-GR">
						<div>
							<dt className="text-GR">MIME</dt>
							<dd className="mt-0.5 truncate">
								{asset.mimeType}
							</dd>
						</div>
						<div>
							<dt className="text-GR">サイズ</dt>
							<dd className="mt-0.5">
								{formatFileSize(asset.size)}
							</dd>
						</div>
						<div className="col-span-2">
							<dt className="text-GR">寸法</dt>
							<dd className="mt-0.5">
								{formatDimensions(asset.width, asset.height)}
							</dd>
						</div>
					</dl>

					{selectable ? (
						<>
							<p className="text-xs text-GR">
								{asset.alt?.trim()
									? asset.alt
									: "代替テキスト未設定"}
							</p>
							<button
								type="button"
								className={`w-full ${adminBtnGhostSm}`}
								onClick={() => onSelect?.(asset)}
							>
								この画像を使う
							</button>
						</>
					) : readOnly ? (
						<p className="text-xs text-GR">
							{asset.alt?.trim()
								? asset.alt
								: "代替テキスト未設定"}
						</p>
					) : (
						<>
							<label className="block">
								<span className="text-xs font-medium text-GR">
									代替テキスト
								</span>
								<input
									className={adminFieldControlCompact}
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
								className={`${adminBtnGhostSm} disabled:cursor-not-allowed disabled:opacity-60`}
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
						<p className="text-xs text-AC">{errors[asset.id]}</p>
					) : null}
				</div>
			</li>
		);
      })}
    </ul>
  );
}
