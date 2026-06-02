"use client";

import { adminBtnDanger } from "@/components/admin-layout/admin-ui-classes";
import type { ComposableFieldDirectory } from "@/components/content-editor/ComposableContentForm.model";

interface DirectoryDeleteDialogProps {
	directory: ComposableFieldDirectory | null;
	onCancel: () => void;
	onConfirm: () => void;
}

export function DirectoryDeleteDialog({
	directory,
	onCancel,
	onConfirm,
}: DirectoryDeleteDialogProps) {
	if (!directory) return null;

	return (
		<div
			data-l="DeleteOverlay"
			className="fixed inset-0 z-50 grid place-items-center bg-TC/30 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="DirectoryDeleteDialogTitle"
		>
			<div
				data-l="DeleteDialog"
				className="w-full max-w-sm rounded-md border border-TC/20 bg-WH p-5 shadow-xl"
			>
				<h2
					id="DirectoryDeleteDialogTitle"
					className="text-base font-bold text-TC"
				>
					ディレクトリを削除しますか？
				</h2>
				<p className="mt-3 text-sm leading-6 text-GR">
					{directory.name}{" "}
					を削除します。中のフィールドは先頭のディレクトリへ移動します。
				</p>
				<div data-l="DeleteActions" className="mt-5 flex justify-end gap-2">
					<button
						type="button"
						className="rounded-md border border-TC/20 px-3 py-2 text-TC transition hover:bg-TC/5"
						onClick={onCancel}
					>
						キャンセル
					</button>
					<button
						type="button"
						className={adminBtnDanger}
						autoFocus
						onClick={onConfirm}
					>
						削除
					</button>
				</div>
			</div>
		</div>
	);
}
