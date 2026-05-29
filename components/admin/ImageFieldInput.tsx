'use client';

import { useEffect, useRef, useState } from 'react';
import { AssetGrid } from './AssetGrid';
import { adminFetch, type ApiAssetCollection, type ApiAssetRecord, type ImageFieldValue } from './admin-api';

interface ImageFieldInputProps {
  siteId: string;
  label: string;
  required?: boolean;
  helpText?: string;
  value: ImageFieldValue;
  onChange: (value: ImageFieldValue) => void;
  readOnly?: boolean;
}

const inputClassName =
  'mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20';

export function ImageFieldInput({ siteId, label, required, helpText, value, onChange, readOnly = false }: ImageFieldInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<ApiAssetRecord[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');

  async function handleFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);
    if (value.alt.trim()) {
      formData.append('alt', value.alt.trim());
    }

    const result = await adminFetch<ApiAssetRecord>(`/api/admin/sites/${siteId}/assets`, {
      method: 'POST',
      body: formData,
    });

    setIsUploading(false);

    if (!result.ok || !result.data) {
      setUploadError(result.error ?? '画像のアップロードに失敗しました。');
      return;
    }

    onChange({
      url: result.data.url,
      alt: result.data.alt ?? value.alt,
    });
  }

  useEffect(() => {
    if (!isLibraryOpen) {
      return;
    }

    let cancelled = false;

    async function loadLibraryAssets() {
      setLibraryLoading(true);
      setLibraryError('');

      const result = await adminFetch<ApiAssetCollection>(`/api/admin/sites/${siteId}/assets`);

      if (cancelled) {
        return;
      }

      setLibraryLoading(false);

      if (!result.ok || !result.data) {
        setLibraryError(result.error ?? 'メディアライブラリの取得に失敗しました。');
        return;
      }

      setLibraryAssets(result.data.items);
    }

    void loadLibraryAssets();

    return () => {
      cancelled = true;
    };
  }, [isLibraryOpen, siteId]);

  function handleLibrarySelect(asset: ApiAssetRecord) {
    onChange({
      url: asset.url,
      alt: asset.alt ?? value.alt,
    });
    setIsLibraryOpen(false);
  }

  return (
		<div className="ImageFieldInput block">
			<div className="flex items-center gap-2 text-sm font-medium text-white">
				<span>{label}</span>
				{required ? (
					<span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-xs text-sky-200">
						必須
					</span>
				) : null}
			</div>

			<div className="ImageFieldInput_controls mt-3 flex flex-wrap items-center gap-3">
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
								event.target.value = "";
							}}
						/>
						<button
							type="button"
							className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading}
						>
							{isUploading
								? "アップロード中…"
								: "画像をアップロード"}
						</button>
						<button
							type="button"
							className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
							onClick={() => setIsLibraryOpen(true)}
						>
							ライブラリから選択
						</button>
					</>
				) : null}
				{value.url ? (
					<span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
						登録済み
					</span>
				) : null}
			</div>

			{value.url ? (
				<div className="ImageFieldInput_preview mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-3">
					<img
						src={value.url}
						alt={value.alt || label}
						className="max-h-48 w-full rounded-xl object-contain"
					/>
				</div>
			) : null}

			<label className="mt-4 block">
				<span className="text-xs font-medium text-slate-300">
					画像 URL
				</span>
				<input
					className={inputClassName}
					type="url"
					placeholder="/uploads/site-id/example.jpg"
					value={value.url}
					onChange={(event) =>
						onChange({ ...value, url: event.target.value })
					}
					disabled={readOnly}
					readOnly={readOnly}
				/>
			</label>

			<label className="mt-4 block">
				<span className="text-xs font-medium text-slate-300">
					代替テキスト
				</span>
				<input
					className={inputClassName}
					type="text"
					placeholder="画像の説明"
					value={value.alt}
					onChange={(event) =>
						onChange({ ...value, alt: event.target.value })
					}
					disabled={readOnly}
					readOnly={readOnly}
				/>
			</label>

			{uploadError ? (
				<p className="mt-2 text-xs text-rose-300">{uploadError}</p>
			) : null}
			{helpText ? (
				<p className="mt-2 text-xs leading-5 text-slate-400">
					{helpText}
				</p>
			) : null}

			{isLibraryOpen ? (
				<div
					className="ImageFieldInput_modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
					role="dialog"
					aria-modal="true"
					aria-label="メディアライブラリ"
				>
					<div className="ImageFieldInput_modalPanel flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden  border border-white/10 bg-slate-900 shadow-2xl">
						<div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
							<div>
								<p className="text-lg font-semibold text-white">
									メディアライブラリ
								</p>
								<p className="text-sm text-slate-400">
									登録済みの画像から選択します。
								</p>
							</div>
							<button
								type="button"
								className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
								onClick={() => setIsLibraryOpen(false)}
							>
								閉じる
							</button>
						</div>

						<div className="overflow-y-auto px-5 py-5">
							{libraryLoading ? (
								<p className="text-sm text-slate-400">
									読み込み中…
								</p>
							) : libraryError ? (
								<p className="text-sm text-rose-300">
									{libraryError}
								</p>
							) : (
								<AssetGrid
									siteId={siteId}
									assets={libraryAssets}
									selectable
									selectedUrl={value.url}
									onSelect={handleLibrarySelect}
								/>
							)}
						</div>
					</div>
				</div>
			) : null}
		</div>
  );
}
