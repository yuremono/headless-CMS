"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CmsAuthProvider } from "@/lib/auth/production-config";
import { useAdminAccess } from "@/components/admin-layout/AdminAccessContext";
import {
	adminFetch,
	buildContentWriteBody,
	type ApiContentRecord,
} from "@/components/admin-data/admin-api";
import { ComposableDirectoryNav } from "@/components/content-editor/ComposableDirectoryNav";
import { DirectoryDeleteDialog } from "@/components/content-editor/DirectoryDeleteDialog";
import { FieldAddPanel } from "@/components/content-editor/FieldAddPanel";
import { FieldGroup } from "@/components/content-editor/FieldGroup";
import { ManualModal } from "@/components/content-editor/ManualModal";
import { MediaLibraryModal } from "@/components/content-editor/MediaLibraryModal";
import type { MediaUploadResult } from "@/components/media-library/MediaUploadZone";
import type { ContentRecord, ContentTypeDefinition } from "@/components/admin-data/admin-data-types";
import {
	DEFAULT_DIRECTORY_ID,
	buildGroupsFromDefinitions,
	collectComposableFieldDefinitions,
	createDirectoryId,
	createGroupId,
	getGroupPrefix,
	hydrateDirectories,
	mergeDataForSave,
	mergeGroupsWithDefinitions,
	serializeDirectories,
	uniqueStrings,
	type ComposableFieldDefinitions,
	type ComposableFieldDirectories,
	type ComposableFieldDirectory,
} from "@/components/content-editor/ComposableContentForm.model";
import {
	collectComposableFieldFormats,
	duplicateFieldGroup,
	nextDuplicatePrefix,
	restoreGroupsFromData,
	type ComposableFieldFormat,
	type ComposableFieldGroup,
	type ComposableFieldRow,
} from "@/lib/admin/field-type-catalog";

interface ComposableContentFormProps {
	siteId: string;
	contentType: ContentTypeDefinition;
	record: ContentRecord;
	previewUrl?: string | null;
	fieldFormats?: Record<string, ComposableFieldFormat>;
	fieldDirectories?: ComposableFieldDirectories;
	fieldDefinitions?: ComposableFieldDefinitions;
	authProvider?: CmsAuthProvider;
	showLogout?: boolean;
	manualMarkdown?: string;
}

export function ComposableContentForm({
	siteId,
	contentType,
	record,
	previewUrl,
	fieldFormats = {},
	fieldDirectories,
	fieldDefinitions,
	authProvider = "none",
	showLogout = false,
	manualMarkdown = "",
}: ComposableContentFormProps) {
	const router = useRouter();
	const { readOnly } = useAdminAccess();
	const initialGroups = useMemo(
		() =>
			mergeGroupsWithDefinitions(
				restoreGroupsFromData(
					record.data ?? {},
					createGroupId,
					fieldFormats,
				),
				buildGroupsFromDefinitions(fieldDefinitions, record.data ?? {}),
			),
		[fieldDefinitions, fieldFormats, record.data],
	);
	const initialDirectories = useMemo(
		() => hydrateDirectories(fieldDirectories, initialGroups),
		[fieldDirectories, initialGroups],
	);
	const [groups, setGroups] = useState<ComposableFieldGroup[]>(initialGroups);
	const [directories, setDirectories] = useState<ComposableFieldDirectory[]>(
		() => initialDirectories,
	);
	const [activeDirectoryId, setActiveDirectoryId] = useState(
		() => initialDirectories[0]?.id ?? DEFAULT_DIRECTORY_ID,
	);
	const [statusMessage, setStatusMessage] = useState("");
	const [statusKind, setStatusKind] = useState<"success" | "error">(
		"success",
	);
	const [statusVisible, setStatusVisible] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [isManualOpen, setIsManualOpen] = useState(false);
	const [isLibraryOpen, setIsLibraryOpen] = useState(false);
	const [libraryAssetsReady, setLibraryAssetsReady] = useState(false);
	const [libraryDescription, setLibraryDescription] =
		useState("登録済みの画像から選択します。");
	const [libraryReloadToken, setLibraryReloadToken] = useState(0);
	const [pendingDirectoryDelete, setPendingDirectoryDelete] =
		useState<ComposableFieldDirectory | null>(null);

	const sourceData = useMemo(() => record.data ?? {}, [record.data]);
	const activeDirectory =
		directories.find((directory) => directory.id === activeDirectoryId) ??
		directories[0];
	const visiblePrefixSet = new Set(activeDirectory?.prefixes ?? []);
	const visibleGroups = groups.filter((group) =>
		visiblePrefixSet.has(getGroupPrefix(group)),
	);

	useEffect(() => {
		if (!statusMessage) {
			setStatusVisible(false);
			return undefined;
		}

		setStatusVisible(true);
		const timerId = window.setTimeout(() => setStatusVisible(false), 1500);
		return () => window.clearTimeout(timerId);
	}, [statusMessage]);

	function handleAddGroup(
		prefix: string,
		fields: ComposableFieldRow[],
		repeatable = false,
	) {
		if (fields.length === 0) {
			return;
		}

		setGroups((current) => [
			...current,
			{
				id: createGroupId(),
				prefix,
				fields,
				...(repeatable ? { repeatable: true as const, items: [] } : {}),
			},
		]);
		setDirectories((current) =>
			current.map((directory) =>
				directory.id === activeDirectoryId
					? {
							...directory,
							prefixes: uniqueStrings([
								...directory.prefixes,
								prefix,
							]),
						}
					: directory,
			),
		);
	}

	function updateGroup(groupId: string, nextGroup: ComposableFieldGroup) {
		const previousGroup = groups.find((group) => group.id === groupId);
		const previousPrefix = previousGroup
			? getGroupPrefix(previousGroup)
			: "";
		const nextPrefix = getGroupPrefix(nextGroup);

		setGroups((current) =>
			current.map((group) => (group.id === groupId ? nextGroup : group)),
		);

		if (previousPrefix && nextPrefix && previousPrefix !== nextPrefix) {
			setDirectories((directoryList) =>
				directoryList.map((directory) => ({
					...directory,
					prefixes: uniqueStrings(
						directory.prefixes.map((prefix) =>
							prefix === previousPrefix ? nextPrefix : prefix,
						),
					),
				})),
			);
		}
	}

	function removeGroup(groupId: string) {
		const removed = groups.find((group) => group.id === groupId);
		const removedPrefix = removed ? getGroupPrefix(removed) : "";

		setGroups((current) => current.filter((group) => group.id !== groupId));

		if (removedPrefix) {
			setDirectories((directoryList) =>
				directoryList.map((directory) => ({
					...directory,
					prefixes: directory.prefixes.filter(
						(prefix) => prefix !== removedPrefix,
					),
				})),
			);
		}
	}

	function handleDuplicateGroup(groupId: string) {
		const sourceIndex = groups.findIndex((group) => group.id === groupId);
		if (sourceIndex === -1) {
			return;
		}

		const source = groups[sourceIndex]!;
		const newPrefix = nextDuplicatePrefix(
			source.prefix,
			groups.map((group) => group.prefix),
		);
		const duplicated = {
			...duplicateFieldGroup(source, newPrefix),
			id: createGroupId(),
		};

		setGroups((current) => {
			const next = [...current];
			next.splice(sourceIndex + 1, 0, duplicated);
			return next;
		});
		setDirectories((directoryList) =>
			directoryList.map((directory) => {
				if (!directory.prefixes.includes(source.prefix)) {
					return directory;
				}

				const sourcePrefixIndex = directory.prefixes.indexOf(
					source.prefix,
				);
				const prefixes = [...directory.prefixes];
				prefixes.splice(sourcePrefixIndex + 1, 0, newPrefix);
				return { ...directory, prefixes: uniqueStrings(prefixes) };
			}),
		);
	}

	function handleAddDirectory() {
		const nextDirectory = {
			id: createDirectoryId(),
			name: "New Directory",
			prefixes: [],
		};

		setDirectories((current) => [...current, nextDirectory]);
		setActiveDirectoryId(nextDirectory.id);
	}

	function handleRenameDirectory(directoryId: string, name: string) {
		setDirectories((current) =>
			current.map((directory) =>
				directory.id === directoryId
					? { ...directory, name }
					: directory,
			),
		);
	}

	function handleConfirmDeleteDirectory() {
		if (!pendingDirectoryDelete) {
			return;
		}

		const removedId = pendingDirectoryDelete.id;

		setDirectories((current) => {
			if (current.length <= 1) {
				return current;
			}

			const removedDirectory = current.find(
				(directory) => directory.id === removedId,
			);
			const remainingDirectories = current.filter(
				(directory) => directory.id !== removedId,
			);
			const movedPrefixes = removedDirectory?.prefixes ?? [];

			if (remainingDirectories.length === 0) {
				return current;
			}

			return remainingDirectories.map((directory, index) =>
				index === 0
					? {
							...directory,
							prefixes: uniqueStrings([
								...directory.prefixes,
								...movedPrefixes,
							]),
						}
					: directory,
			);
		});

		setActiveDirectoryId((currentId) => {
			if (currentId !== removedId) {
				return currentId;
			}

			const nextDirectory = directories.find(
				(directory) => directory.id !== removedId,
			);
			return nextDirectory?.id ?? currentId;
		});
		setPendingDirectoryDelete(null);
	}

	function handleLibraryUploadComplete(results: MediaUploadResult[]) {
		if (results.some((result) => result.asset)) {
			setLibraryAssetsReady(false);
			setLibraryReloadToken((current) => current + 1);
		}
	}

	async function persist(action: "save" | "publish") {
		if (readOnly) {
			setStatusKind("error");
			setStatusMessage("");
			window.setTimeout(
				() => setStatusMessage("編集権限がありません。"),
				0,
			);
			return;
		}

		setIsPending(true);
		setStatusMessage("");

		const data = mergeDataForSave(sourceData, groups);
		const body = buildContentWriteBody({
			title: record.title,
			slug: record.slug,
			data,
			status: action === "publish" ? "published" : "draft",
			fieldFormats: collectComposableFieldFormats(groups),
			fieldDirectories: serializeDirectories(
				directories,
				groups,
				activeDirectoryId,
			),
			fieldDefinitions: collectComposableFieldDefinitions(groups),
		});

		try {
			const endpoint = `/api/admin/sites/${siteId}/content/${contentType.slug}?id=${encodeURIComponent(record.id)}`;
			const response = await adminFetch<ApiContentRecord>(endpoint, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			if (!response.ok || !response.data) {
				throw new Error(response.error ?? `HTTP ${response.status}`);
			}

			setStatusKind("success");
			setStatusMessage(
				action === "publish" ? "公開しました" : "下書きを保存しました",
			);
			router.refresh();
		} catch (cause) {
			const message =
				cause instanceof Error ? cause.message : "保存に失敗しました";
			setStatusKind("error");
			setStatusMessage(`API エラー: ${message}`);
		} finally {
			setIsPending(false);
		}
	}

	return (
		<section
			data-l="ContentForm"
			className="ComposableContentForm flex lg:h-full flex-col gap-4 overflow-visible lg:flex-row lg:gap-6"
		>
			<ComposableDirectoryNav
				readOnly={readOnly}
				directories={directories}
				activeDirectory={activeDirectory}
				showLogout={showLogout}
				authProvider={authProvider}
				onAddDirectory={handleAddDirectory}
				onSelectDirectory={setActiveDirectoryId}
				onRenameDirectory={handleRenameDirectory}
				onRequestDeleteDirectory={setPendingDirectoryDelete}
				onOpenManual={() => setIsManualOpen(true)}
				onOpenLibrary={() => {
					setLibraryAssetsReady(false);
					setLibraryReloadToken((current) => current + 1);
					setIsLibraryOpen(true);
				}}
			/>

                        <div
				data-l="FieldAddPanel"
                                className=" mt-0 flex min-w-0 flex-1 flex-col items-stretch gap-4  lg:flex-row lg:items-start lg:gap-6 lg:border-l border-TC/20 lg:pl-6  lg:overflow-y-auto ">
				<FieldAddPanel
					sourceData={sourceData}
					onAdd={handleAddGroup}
					previewUrl={previewUrl}
					isPending={isPending}
					onSave={() => void persist("save")}
					onPublish={() => void persist("publish")}
					authProvider={authProvider}
					showLogout={false}
					existingPrefixes={groups.map(getGroupPrefix)}
					actionNotice={
						statusMessage && statusVisible ? (
							<p
								className={`font-bold  ${
									statusKind === "success"
										? "text-SC"
										: "text-AC"
								}`}
								role="status"
							>
								{statusMessage}
							</p>
						) : null
					}
				/>

                                <div
				        data-l="FieldGroupWrapper"
                                        className="min-w-0 flex-1 h-full overflow-y-auto pr-2 ">
					{groups.length === 0 ? (
						<p className=" text-GR">
							フィールドはまだありません。左のパネルから追加してください。
						</p>
					) : visibleGroups.length === 0 ? (
						<p className=" text-GR">
							このディレクトリにはフィールドがありません。左のパネルから追加してください。
						</p>
					) : (
						<div
							data-l="FieldGroupList"
							className="min-w-0 border-t border-TC/20"
						>
							{visibleGroups.map((group) => (
								<FieldGroup
									key={group.id}
									siteId={siteId}
									group={group}
									sourceData={sourceData}
									onChange={(next) =>
										updateGroup(group.id, next)
									}
									onRemove={() => removeGroup(group.id)}
									onDuplicate={() =>
										handleDuplicateGroup(group.id)
									}
									readOnly={false}
									disablePersistentActions={readOnly}
								/>
							))}
						</div>
					)}
				</div>
			</div>
			<ManualModal
				open={isManualOpen}
				manualMarkdown={manualMarkdown}
				onClose={() => setIsManualOpen(false)}
			/>

			<MediaLibraryModal
				open={isLibraryOpen}
				assetsReady={libraryAssetsReady}
				description={libraryDescription}
				siteId={siteId}
				readOnly={readOnly}
				reloadToken={libraryReloadToken}
				onDescriptionChange={setLibraryDescription}
				onClose={() => setIsLibraryOpen(false)}
				onUploadComplete={handleLibraryUploadComplete}
				onAssetsReadyChange={setLibraryAssetsReady}
			/>

			<DirectoryDeleteDialog
				directory={pendingDirectoryDelete}
				onCancel={() => setPendingDirectoryDelete(null)}
				onConfirm={handleConfirmDeleteDirectory}
			/>
		</section>
	);
}
