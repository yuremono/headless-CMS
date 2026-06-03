"use client";

import { useMemo } from "react";
import { renderManualMarkdown } from "@/components/content-editor/ComposableContentForm.model";

interface ManualModalProps {
	open: boolean;
	manualMarkdown: string;
	onClose: () => void;
}

export function ManualModal({
	open,
	manualMarkdown,
	onClose,
}: ManualModalProps) {
	const manualContent = useMemo(
		() => renderManualMarkdown(manualMarkdown),
		[manualMarkdown],
	);

	return (
		<dialog
			data-l="ManualModal"
			className={`content-center fixed inset-0 z-50 m-0 h-screen max-h-none w-screen max-w-none border-0 bg-transparent p-4 backdrop-blur-sm transition-opacity duration-300 ${
				open ? "grid" : "block"
			} ${
				open
					? "pointer-events-auto opacity-100"
					: "pointer-events-none opacity-0"
			}`}
			open={open}
			aria-label="Manual"
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div
				data-l="ManualPanel"
				className={` mx-auto flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden border border-TC/20 bg-WH/70 transition-opacity duration-300 ${
					open ? "opacity-100" : "opacity-0"
				}`}
			>
				<div
					data-l="ManualHeader"
					className="flex items-center justify-between border-b border-TC/20 px-5 py-4"
				>
					<h2 className="mt-1 font-bold text-TC">
						ユーザーマニュアル
					</h2>
					<button
						type="button"
						className="BtnSm"
						onClick={onClose}
						aria-label="閉じる"
					>
						閉じる
					</button>
				</div>
				<div
					data-l="ManualBody"
					className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
				>
					<div className="grid gap-4 ">
						{manualContent.length > 0 ? (
							manualContent
						) : (
							<p className="leading-6 text-GR">
								マニュアルファイルを読み込めませんでした。
							</p>
						)}
					</div>
				</div>
			</div>
		</dialog>
	);
}
