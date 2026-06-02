"use client";

import { adminBtnSm } from "@/components/admin-layout/admin-ui-classes";
import { MediaLibraryBrowser } from "@/components/media-library/MediaLibraryBrowser";
import {
	MediaUploadZone,
	type MediaUploadResult,
} from "@/components/media-library/MediaUploadZone";

interface MediaLibraryModalProps {
	open: boolean;
	assetsReady: boolean;
	description: string;
	siteId: string;
	readOnly: boolean;
	reloadToken: number;
	onDescriptionChange: (description: string) => void;
	onClose: () => void;
	onUploadComplete: (results: MediaUploadResult[]) => void;
	onAssetsReadyChange: (ready: boolean) => void;
}

export function MediaLibraryModal({
	open,
	assetsReady,
	description,
	siteId,
	readOnly,
	reloadToken,
	onDescriptionChange,
	onClose,
	onUploadComplete,
	onAssetsReadyChange,
}: MediaLibraryModalProps) {
	return (
		<dialog
			data-l="MediaManagerModal"
			className={`content-center fixed inset-0 z-50 m-0 h-screen max-h-none w-screen max-w-none border-0 bg-transparent p-4 backdrop-blur-sm transition-opacity duration-300 ${
				open ? "grid" : "hidden"
			} ${
				open && assetsReady
					? "pointer-events-auto opacity-100"
					: "pointer-events-none opacity-0"
			}`}
			open={open}
			aria-label="メディアライブラリ"
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div
				data-l="MediaManagerPanel"
				className={` mx-auto flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden border border-TC/20 bg-WH/70 transition-opacity duration-300 ${
					open && assetsReady ? "opacity-100" : "opacity-0"
				}`}
			>
				<div
					data-l="MediaManagerHeader"
					className="relative z-20 flex items-center justify-between border-b border-TC/20 bg-WH px-5 py-4"
				>
					<div>
						<h2 className="mt-1 font-bold text-TC">メディアライブラリ</h2>
					</div>
					<div className="ml-4 flex items-center gap-2">
						<MediaUploadZone
							siteId={siteId}
							compact
							buttonLabel="画像アップロード"
							onBatchComplete={onUploadComplete}
						/>
						<button
							type="button"
							className={adminBtnSm}
							onClick={onClose}
							aria-label="閉じる"
						>
							閉じる
						</button>
					</div>
				</div>
				<div
					data-l="MediaManagerBody"
					className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
				>
					{/* <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center p-5">
						<input
							className="pointer-events-auto w-full max-w-2xl border-0 bg-WH/90 px-4 py-2 text-GR outline-none ring-1 ring-TC/10 focus:ring-2 focus:ring-SC/30"
							type="text"
							value={description}
							onChange={(event) => onDescriptionChange(event.target.value)}
							aria-label="メディアライブラリの説明"
						/>
					</div> */}
					<MediaLibraryBrowser
						siteId={siteId}
						readOnly
						allowDelete={!readOnly}
						reloadToken={reloadToken}
						onAssetsReadyChange={onAssetsReadyChange}
					/>
				</div>
			</div>
		</dialog>
	);
}
