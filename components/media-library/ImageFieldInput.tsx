"use client";

import { useEffect, useState } from "react";

import { AssetGrid, AssetGridSkeleton } from "@/components/media-library/AssetGrid";

import { MediaUploadZone, type MediaUploadResult } from "@/components/media-library/MediaUploadZone";

import {
	adminFetch,
	type ApiAssetCollection,
	type ApiAssetRecord,
	type ImageFieldValue,
} from "@/components/admin-data/admin-api";

import {
	adminBadgeRequired,
	adminBadgeSuccess,
	adminBtnSm,
	adminFieldControl,
} from "@/components/admin-layout/admin-ui-classes";

interface ImageFieldInputProps {
	siteId: string;
	label: string;
	required?: boolean;
	helpText?: string;
	value: ImageFieldValue;
	onChange: (value: ImageFieldValue) => void;
	readOnly?: boolean;
	disableUpload?: boolean;
}

export function ImageFieldInput({
	siteId,
	label,
	required,
	helpText,
	value,
	onChange,
	readOnly = false,
	disableUpload = false,
}: ImageFieldInputProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState("");
	const [isLibraryOpen, setIsLibraryOpen] = useState(false);
	const [libraryAssets, setLibraryAssets] = useState<ApiAssetRecord[]>([]);
	const [libraryLoading, setLibraryLoading] = useState(false);
	const [libraryError, setLibraryError] = useState("");
	const [libraryAssetsReady, setLibraryAssetsReady] = useState(false);

	function handleBatchComplete(results: MediaUploadResult[]) {
		setIsUploading(false);

		const uploaded = results.find((item) => item.asset)?.asset;

		if (uploaded) {
			onChange({
				url: uploaded.url,
				alt: uploaded.alt ?? value.alt,
			});
			setUploadError("");
			return;
		}

		setUploadError(
			results[0]?.error ?? "画像のアップロードに失敗しました。",
		);
	}

	useEffect(() => {
		if (!isLibraryOpen) {
			return;
		}

		let cancelled = false;

		async function loadLibraryAssets() {
			setLibraryLoading(true);
			setLibraryError("");
			setLibraryAssetsReady(false);

			const result = await adminFetch<ApiAssetCollection>(
				`/api/admin/sites/${siteId}/assets`,
			);

			if (cancelled) {
				return;
			}

			setLibraryLoading(false);

			if (!result.ok || !result.data) {
				setLibraryError(
					result.error ?? "メディアライブラリの取得に失敗しました。",
				);
				return;
			}

			setLibraryAssets(
				result.data.items.filter((asset) =>
					asset.mimeType.startsWith("image/"),
				),
			);
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

	function handleLibraryAssetDeleted(deleted: ApiAssetRecord) {
		setLibraryAssets((current) =>
			current.filter((asset) => asset.id !== deleted.id),
		);

		if (value.url === deleted.url) {
			onChange({
				url: "",
				alt: value.alt,
			});
		}
	}

	const previewIsVideo =
		value.url && /\.(mp4|webm|mov|avi)(\?|$)/i.test(value.url);
	const isLibraryModalReady =
		!libraryLoading &&
		(!!libraryError || libraryAssets.length === 0 || libraryAssetsReady);

	return (
		<div data-l="ImageField" className="ImageFieldInput block">
			{" "}
			<div
				data-l="FieldLabel"
				className="flex items-center gap-2 text-sm font-medium"
			>
				{" "}
				<span> {label}</span>{" "}
				{required ? (
					<span className={adminBadgeRequired}>必須</span>
				) : null}
			</div>{" "}
			<div
				data-l="FieldControls"
				className="ImageFieldInput_controls mt-3 flex flex-wrap items-center gap-3"
			>
				{" "}
				{!readOnly ? (
					<>
						{" "}
						<button
							type="button"
							className={adminBtnSm}
							onClick={() => {
								setLibraryAssetsReady(false);
								setIsLibraryOpen(true);
							}}
						>
							{" "}
							ライブラリから選択{" "}
						</button>{" "}
					</>
				) : null}
				{value.url ? (
					<span className={adminBadgeSuccess}>登録済み</span>
				) : null}
			</div>{" "}
			{!readOnly && !disableUpload ? (
				<div data-l="UploadWrap" className="mt-4">
					{" "}
					<MediaUploadZone
						siteId={siteId}
						multiple
						disabled={isUploading}
						buttonLabel={
							isUploading
								? "アップロード中…"
								: "画像をアップロード"
						}
						dropHint="画像をドラッグ&ドロップ、またはクリックして選択（複数可・先頭1件を使用）"
						alt={value.alt}
						onUploadStart={() => {
							setIsUploading(true);
							setUploadError("");
						}}
						onBatchComplete={handleBatchComplete}
					/>{" "}
				</div>
			) : null}
			{value.url ? (
				<div
					data-l="FieldPreview"
					className="ImageFieldInput_preview mt-4 overflow-hidden rounded-md border border-TC/20 p-3"
				>
					{" "}
					{previewIsVideo ? (
						<video
							src={value.url}
							controls
							className="max-h-48 w-full rounded-md object-contain"
						/>
					) : (
						<img
							src={value.url}
							alt={value.alt || label}
							className="max-h-48 w-full rounded-md object-contain"
						/>
					)}
				</div>
			) : null}
			<label className="mt-4 block">
				{" "}
				<span className="text-xs font-medium text-GR">
					画像 URL
				</span>{" "}
				<input
					className={adminFieldControl}
					type="url"
					placeholder="/uploads/site-id/example.jpg"
					value={value.url}
					onChange={(event) =>
						onChange({
							...value,
							url: event.target.value,
						})
					}
					disabled={readOnly}
					readOnly={readOnly}
				/>{" "}
			</label>{" "}
			<label className="mt-4 block">
				{" "}
				<span className="text-xs font-medium text-GR">
					代替テキスト
				</span>{" "}
				<input
					className={adminFieldControl}
					type="text"
					placeholder="画像の説明"
					value={value.alt}
					onChange={(event) =>
						onChange({
							...value,
							alt: event.target.value,
						})
					}
					disabled={readOnly}
					readOnly={readOnly}
				/>{" "}
			</label>{" "}
			{uploadError ? (
				<p className="mt-2 text-xs text-AC"> {uploadError}</p>
			) : null}
			{helpText ? (
				<p className="mt-2 text-xs leading-5 text-GR"> {helpText}</p>
			) : null}
			<dialog
				data-l="LibraryModal"
				className={`content-center ImageFieldInput_modal fixed inset-0 z-50 m-0 h-screen max-h-none w-screen max-w-none border-0 bg-transparent p-4 backdrop-blur-sm transition-opacity duration-300 ${
					isLibraryOpen ? "grid" : "hidden"
				} ${
					isLibraryOpen && isLibraryModalReady
						? "pointer-events-auto opacity-100"
						: "pointer-events-none opacity-0"
				}`}
				open={isLibraryOpen}
				aria-label="メディアライブラリ"
				onClick={(event) => {
					if (event.target === event.currentTarget) {
						setIsLibraryOpen(false);
					}
				}}
			>
				<div
					data-l="ModalPanel"
					className={`ImageFieldInput_modalPanel  mx-auto flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden border border-TC/20 bg-WH/70 transition-opacity duration-300 ${
						isLibraryOpen && isLibraryModalReady
							? "opacity-100"
							: "opacity-0"
					}`}
				>
					<div
						data-l="ModalHeader"
						className="flex items-center justify-between border-b border-TC/20 px-5 py-4"
					>
						<div>
							<p className="text-lg font-semibold">
								メディアライブラリ
							</p>
							<p className="text-sm text-GR">
								登録済みの画像から選択します。
							</p>
						</div>
						<button
							type="button"
							className={adminBtnSm}
							onClick={() => setIsLibraryOpen(false)}
						>
							閉じる
						</button>
					</div>
					<div
						data-l="ModalBody"
						className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
					>
						{libraryLoading ? (
							<div role="status" aria-label="メディアを読み込み中">
								<AssetGridSkeleton />
							</div>
						) : libraryError ? (
							<p className="text-sm text-AC">{libraryError}</p>
						) : (
							<AssetGrid
								siteId={siteId}
								assets={libraryAssets}
								selectable
								selectedUrl={value.url}
								onSelect={handleLibrarySelect}
								onAssetDeleted={handleLibraryAssetDeleted}
								onAssetsReadyChange={setLibraryAssetsReady}
							/>
						)}
					</div>
				</div>
			</dialog>
		</div>
	);
}
