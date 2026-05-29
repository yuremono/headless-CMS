'use client';

import { useState } from 'react';
import { adminFetch, type ApiAssetRecord } from './admin-api';

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
      <div className="AssetGrid rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-10 text-center text-sm text-slate-400">
        アップロード済みのアセットはまだありません。
      </div>
    );
  }

  return (
    <ul className="AssetGrid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset) => {
        const isSelected = selectable && selectedUrl === asset.url;
        const isSaving = savingId === asset.id;

        return (
          <li
            key={asset.id}
            className={`AssetGrid_item overflow-hidden rounded-3xl border bg-slate-950/50 ${
              isSelected ? 'border-sky-400/60 ring-2 ring-sky-400/20' : 'border-white/10'
            }`}
          >
            <div className="AssetGrid_preview relative aspect-[4/3] overflow-hidden bg-slate-950/80">
              {asset.mimeType.startsWith('image/') ? (
                <img src={asset.url} alt={asset.alt ?? asset.filename} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">{asset.mimeType}</div>
              )}

              {selectable ? (
                <button
                  type="button"
                  className="absolute inset-0 bg-slate-950/0 transition hover:bg-slate-950/20"
                  aria-label={`${asset.filename} を選択`}
                  onClick={() => onSelect?.(asset)}
                />
              ) : null}
            </div>

            <div className="AssetGrid_meta space-y-3 p-4">
              <div>
                <p className="truncate text-sm font-medium text-white" title={asset.filename}>
                  {asset.filename}
                </p>
                <p className="mt-1 truncate text-xs text-slate-400" title={asset.url}>
                  {asset.url}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <dt className="text-slate-500">MIME</dt>
                  <dd className="mt-0.5 truncate">{asset.mimeType}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">サイズ</dt>
                  <dd className="mt-0.5">{formatFileSize(asset.size)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">寸法</dt>
                  <dd className="mt-0.5">{formatDimensions(asset.width, asset.height)}</dd>
                </div>
              </dl>

              {selectable ? (
                <>
                  <p className="text-xs text-slate-400">{asset.alt?.trim() ? asset.alt : '代替テキスト未設定'}</p>
                  <button
                    type="button"
                    className="w-full rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    onClick={() => onSelect?.(asset)}
                  >
                    この画像を使う
                  </button>
                </>
              ) : readOnly ? (
                <p className="text-xs text-slate-400">{asset.alt?.trim() ? asset.alt : '代替テキスト未設定'}</p>
              ) : (
                <>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-300">代替テキスト</span>
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                      type="text"
                      value={draftAlts[asset.id] ?? ''}
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
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSaving || (draftAlts[asset.id] ?? '') === (asset.alt ?? '')}
                    onClick={() => {
                      void saveAlt(asset);
                    }}
                  >
                    {isSaving ? '保存中…' : '代替テキストを保存'}
                  </button>
                </>
              )}

              {errors[asset.id] ? <p className="text-xs text-rose-300">{errors[asset.id]}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
