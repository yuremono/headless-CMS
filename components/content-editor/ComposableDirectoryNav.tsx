"use client";

import {
	Folder,
	FolderOpen,
	FolderPlus,
	ImageSquareIcon,
	QuestionIcon,
	X,
} from "@phosphor-icons/react";
import type { CmsAuthProvider } from "@/lib/auth/production-config";
import { LogoutButton } from "@/components/admin-layout/LogoutButton";
import { adminDeleteIconButton } from "@/components/admin-layout/admin-ui-classes";
import type { ComposableFieldDirectory } from "@/components/content-editor/ComposableContentForm.model";

interface ComposableDirectoryNavProps {
	readOnly: boolean;
	directories: ComposableFieldDirectory[];
	activeDirectory: ComposableFieldDirectory | undefined;
	showLogout: boolean;
	authProvider: CmsAuthProvider;
	onAddDirectory: () => void;
	onSelectDirectory: (directoryId: string) => void;
	onRenameDirectory: (directoryId: string, name: string) => void;
	onRequestDeleteDirectory: (directory: ComposableFieldDirectory) => void;
	onOpenManual: () => void;
	onOpenLibrary: () => void;
}

export function ComposableDirectoryNav({
	readOnly,
	directories,
	activeDirectory,
	showLogout,
	authProvider,
	onAddDirectory,
	onSelectDirectory,
	onRenameDirectory,
	onRequestDeleteDirectory,
	onOpenManual,
	onOpenLibrary,
}: ComposableDirectoryNavProps) {
	return (
		<aside
			data-l="DirectoryAside"
			className="DirectoryAside lg:w-64 lg:shrink-0 "
		>
			<nav className="AdminNav flex min-h-full flex-col ">
			<div data-l="NavBrand">
				<h1 className="text-xl font-bold tracking-wider text-SC/50">
					Modular{" "}
					<span className="[font-size:1em]">Headless</span>{" "}
					CMS
					<span className="block font-normal [font-size:0.75em]">
						inspired by microCMS.
					</span>
				</h1>
				<p className="mt-2 ">
					{readOnly
						? "閲覧専用です。入力内容は保存・公開されません。"
						: "フィールドを追加・保存し、サイトやアプリで取得します。"}
				</p>
			</div>

			<div data-l="DirectoryList" className="mt-6 min-h-0 flex-1">
				<div className="mb-2 flex items-center justify-between">
					<p className="text-xs font-bold uppercase tracking-widest text-SC/50">
						Directory
					</p>
					<button
						type="button"
						className="inline-flex items-end gap-1 rounded-md border border-TC/25 px-2 py-0.5 text-xs text-GR transition hover:bg-SC hover:text-WH"
						onClick={onAddDirectory}
					>
						<FolderPlus size={20} />
						作成
					</button>
				</div>
				<ul className="space-y-2">
					{directories.map((directory) => {
						const isActive = directory.id === activeDirectory?.id;
						const DirectoryIcon = isActive ? FolderOpen : Folder;

						return (
							<li key={directory.id}>
								<div
									data-l="DirectoryItem"
									className={`relative flex w-full items-center gap-3 rounded-md border border-TC/10 p-2 pr-10 text-left transition ${
										isActive
											? "bg-SC/15"
											: "hover:bg-WH hover:[--gradStart:--WH] hover:[--gradEnd:--SC10]"
									}`}
									role="button"
									tabIndex={0}
									onClick={() => onSelectDirectory(directory.id)}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											onSelectDirectory(directory.id);
										}
									}}
								>
									<DirectoryIcon size={32} className="shrink-0 text-SC" />
									<div className="min-w-0 flex-1">
										<input
											className="w-full rounded bg-transparent outline-none transition focus:bg-WH focus:text-TC"
											value={directory.name}
											onChange={(event) =>
												onRenameDirectory(directory.id, event.target.value)
											}
											onClick={(event) => event.stopPropagation()}
											onKeyDown={(event) => event.stopPropagation()}
											aria-label="ディレクトリ名"
										/>
										<p className="text-xs text-GR/70">
											{directory.prefixes.length} fields
										</p>
									</div>
									{isActive && directories.length > 1 ? (
										<button
											type="button"
											className={`absolute right-2 top-1/2 -translate-y-1/2 ${adminDeleteIconButton}`}
											onClick={(event) => {
												event.stopPropagation();
												onRequestDeleteDirectory(directory);
											}}
											aria-label={`${directory.name} を削除`}
											title="ディレクトリを削除"
										>
											<X size={16} aria-hidden="true" weight="bold" />
										</button>
									) : null}
								</div>
							</li>
						);
					})}
				</ul>
			</div>

			<div data-l="NavTools" className="mt-auto pt-4">
				<button
					type="button"
					className="text-SC/70 font-bold relative flex w-full items-center gap-3 BtnBase [--gradStart:--TR] [--gradEnd:--TR] p-2 transition hover:bg-WH hover:[--gradStart:--WH] hover:[--gradEnd:--SC10]"
					aria-label="Manual"
					onClick={onOpenManual}
				>
					<QuestionIcon size={32} className="shrink-0 " aria-hidden="true" />
					<span>Manual</span>
				</button>
				<button
					type="button"
					className="text-SC/70 font-bold relative flex w-full items-center gap-3 BtnBase [--gradStart:--TR] [--gradEnd:--TR] p-2 transition hover:bg-WH hover:[--gradStart:--WH] hover:[--gradEnd:--SC10]"
					aria-label="Media Library"
					onClick={onOpenLibrary}
				>
					<ImageSquareIcon
						size={32}
						className="shrink-0 "
						aria-hidden="true"
					/>
					<span>Media Library</span>
				</button>
			</div>

			{showLogout ? (
				<div data-l="NavAccount" className="space-y-2 pt-4">
					<p className="text-xs font-bold uppercase tracking-widest text-SC/50">
						Account
					</p>
					<LogoutButton authProvider={authProvider} />
				</div>
			) : null}
			</nav>
		</aside>
	);
}
