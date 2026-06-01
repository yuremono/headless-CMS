"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, FolderOpen, FolderPlus, X } from "@phosphor-icons/react";
import type { CmsAuthProvider } from "@/lib/auth/production-config";
import { useAdminAccess } from "./AdminAccessContext";
import {
	adminFetch,
	buildContentWriteBody,
	mapApiContentRecord,
	writeFieldValue,
	type ApiContentRecord,
} from "./admin-api";
import { FieldAddPanel } from "./FieldAddPanel";
import { FieldGroup } from "./FieldGroup";
import { LogoutButton } from "./LogoutButton";
import { MediaLibraryBrowser } from "./MediaLibraryBrowser";
import { MediaUploadZone, type MediaUploadResult } from "./MediaUploadZone";
import type { ContentRecord, ContentTypeDefinition } from "./admin-data-types";
import {
	buildRepeatableArrayValue,
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
}

export interface ComposableFieldDirectory {
	id: string;
	name: string;
	prefixes: string[];
}

export interface ComposableFieldDirectories {
	directories: ComposableFieldDirectory[];
	activeDirectoryId?: string;
}

export interface ComposableFieldDefinition {
	prefix: string;
	repeatable?: boolean;
	fields: Array<
		Pick<ComposableFieldRow, "type" | "suffix" | "format" | "bundle">
	>;
}

export interface ComposableFieldDefinitions {
	groups: ComposableFieldDefinition[];
}

const DEFAULT_DIRECTORY_ID = "default";
const DEFAULT_DIRECTORY_NAME = "Default";

function createGroupId(): string {
	return `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDirectoryId(): string {
	return `directory-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getGroupPrefix(group: ComposableFieldGroup): string {
	return group.prefix.trim();
}

function uniqueStrings(values: string[]): string[] {
	return Array.from(
		new Set(values.map((value) => value.trim()).filter(Boolean)),
	);
}

function createDefaultDirectory(
	groups: ComposableFieldGroup[],
): ComposableFieldDirectory {
	return {
		id: DEFAULT_DIRECTORY_ID,
		name: DEFAULT_DIRECTORY_NAME,
		prefixes: uniqueStrings(groups.map(getGroupPrefix)),
	};
}

function hydrateDirectories(
	input: ComposableFieldDirectories | undefined,
	groups: ComposableFieldGroup[],
): ComposableFieldDirectory[] {
	const groupPrefixes = uniqueStrings(groups.map(getGroupPrefix));
	const groupPrefixSet = new Set(groupPrefixes);
	const directories =
		input?.directories
			.map((directory) => ({
				id: directory.id.trim(),
				name: directory.name.trim(),
				prefixes: uniqueStrings(directory.prefixes).filter((prefix) =>
					groupPrefixSet.has(prefix),
				),
			}))
			.filter((directory) => directory.id && directory.name) ?? [];

	if (directories.length === 0) {
		return [createDefaultDirectory(groups)];
	}

	const assigned = new Set(
		directories.flatMap((directory) => directory.prefixes),
	);
	const unassigned = groupPrefixes.filter((prefix) => !assigned.has(prefix));
	if (unassigned.length === 0) {
		return directories;
	}

	const defaultIndex = directories.findIndex(
		(directory) => directory.id === DEFAULT_DIRECTORY_ID,
	);
	if (defaultIndex === -1) {
		return [
			{
				id: DEFAULT_DIRECTORY_ID,
				name: DEFAULT_DIRECTORY_NAME,
				prefixes: unassigned,
			},
			...directories,
		];
	}

	return directories.map((directory, index) =>
		index === defaultIndex
			? {
					...directory,
					prefixes: uniqueStrings([
						...directory.prefixes,
						...unassigned,
					]),
				}
			: directory,
	);
}

function serializeDirectories(
	directories: ComposableFieldDirectory[],
	groups: ComposableFieldGroup[],
	activeDirectoryId: string,
): ComposableFieldDirectories {
	const groupPrefixSet = new Set(uniqueStrings(groups.map(getGroupPrefix)));
	const serializedDirectories = directories
		.map((directory) => ({
			id: directory.id.trim(),
			name: directory.name.trim(),
			prefixes: uniqueStrings(directory.prefixes).filter((prefix) =>
				groupPrefixSet.has(prefix),
			),
		}))
		.filter((directory) => directory.id && directory.name);

	return {
		directories: serializedDirectories,
		...(serializedDirectories.some(
			(directory) => directory.id === activeDirectoryId,
		)
			? { activeDirectoryId }
			: {}),
	};
}

function deleteFieldValue(data: Record<string, unknown>, path: string): void {
	const parts = path
		.split(".")
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length === 0) {
		return;
	}

	let current: unknown = data;
	for (let index = 0; index < parts.length - 1; index += 1) {
		if (!current || typeof current !== "object" || Array.isArray(current)) {
			return;
		}
		current = (current as Record<string, unknown>)[parts[index]!];
	}

	if (!current || typeof current !== "object" || Array.isArray(current)) {
		return;
	}

	delete (current as Record<string, unknown>)[parts[parts.length - 1]!];
}

function readFieldValue(data: Record<string, unknown>, path: string): string {
	const parts = path
		.split(".")
		.map((part) => part.trim())
		.filter(Boolean);
	let current: unknown = data;

	for (const part of parts) {
		if (current === null || current === undefined) {
			return "";
		}
		if (Array.isArray(current)) {
			const index = Number.parseInt(part, 10);
			if (
				!Number.isFinite(index) ||
				index < 0 ||
				index >= current.length
			) {
				return "";
			}
			current = current[index];
			continue;
		}
		if (typeof current !== "object") {
			return "";
		}
		current = (current as Record<string, unknown>)[part];
	}

	return typeof current === "string" ||
		typeof current === "number" ||
		typeof current === "boolean"
		? String(current)
		: "";
}

function buildJsonPath(prefix: string, suffix: string): string {
	return prefix ? `${prefix}.${suffix}` : suffix;
}

function buildGroupsFromDefinitions(
	definitions: ComposableFieldDefinitions | undefined,
	data: Record<string, unknown>,
): ComposableFieldGroup[] {
	if (!definitions?.groups.length) {
		return [];
	}

	return definitions.groups
		.map((definition) => {
			const prefix = definition.prefix.trim();
			const fields = definition.fields.map((field) => {
				const jsonPath = buildJsonPath(prefix, field.suffix);
				return {
					type: field.type,
					suffix: field.suffix,
					jsonPath,
					value: readFieldValue(data, jsonPath),
					...(field.format ? { format: field.format } : {}),
					...(field.bundle ? { bundle: field.bundle } : {}),
				} satisfies ComposableFieldRow;
			});

			return {
				id: createGroupId(),
				prefix,
				fields,
				...(definition.repeatable
					? { repeatable: true as const, items: [] }
					: {}),
			};
		})
		.filter((group) => group.prefix && group.fields.length > 0);
}

function mergeGroupsWithDefinitions(
	dataGroups: ComposableFieldGroup[],
	definitionGroups: ComposableFieldGroup[],
): ComposableFieldGroup[] {
	if (definitionGroups.length === 0) {
		return dataGroups;
	}

	const byPrefix = new Map(
		dataGroups.map((group) => [getGroupPrefix(group), group]),
	);
	for (const definitionGroup of definitionGroups) {
		const prefix = getGroupPrefix(definitionGroup);
		const current = byPrefix.get(prefix);
		if (!current || current.fields.length === 0) {
			byPrefix.set(prefix, definitionGroup);
			continue;
		}

		const existingSuffixes = new Set(
			current.fields.map((field) => field.suffix),
		);
		const missingFields = definitionGroup.fields.filter(
			(field) => !existingSuffixes.has(field.suffix),
		);
		if (missingFields.length > 0) {
			byPrefix.set(prefix, {
				...current,
				fields: [...current.fields, ...missingFields],
			});
		}
	}

	return Array.from(byPrefix.values()).sort((left, right) =>
		left.prefix.localeCompare(right.prefix),
	);
}

function collectComposableFieldDefinitions(
	groups: ComposableFieldGroup[],
): ComposableFieldDefinitions {
	return {
		groups: groups
			.map((group) => ({
				prefix: getGroupPrefix(group),
				...(group.repeatable ? { repeatable: true } : {}),
				fields: group.fields.map((field) => ({
					type: field.type,
					suffix: field.suffix,
					...(field.format ? { format: field.format } : {}),
					...(field.bundle ? { bundle: field.bundle } : {}),
				})),
			}))
			.filter((group) => group.prefix && group.fields.length > 0),
	};
}

function mergeDataForSave(
	baseData: Record<string, unknown>,
	groups: ComposableFieldGroup[],
): Record<string, unknown> {
	const merged = structuredClone(baseData) as Record<string, unknown>;
	const nextPrefixes = new Set(uniqueStrings(groups.map(getGroupPrefix)));
	const previousGroups = restoreGroupsFromData(baseData, createGroupId);

	for (const previousGroup of previousGroups) {
		const previousPrefix = getGroupPrefix(previousGroup);
		if (previousPrefix && !nextPrefixes.has(previousPrefix)) {
			deleteFieldValue(merged, previousPrefix);
		}
	}

	for (const group of groups) {
		if (group.repeatable) {
			const normalizedPrefix = group.prefix.trim();
			if (normalizedPrefix) {
				merged[normalizedPrefix] = buildRepeatableArrayValue(
					group.items ?? [],
				);
			}
			continue;
		}

		for (const field of group.fields) {
			writeFieldValue(merged, field.jsonPath, field.value);
		}
	}

	return merged;
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
			className="ComposableContentForm flex h-full flex-col gap-4 overflow-visible lg:flex-row lg:gap-6"
		>
			<aside
				data-l="DirectoryAside"
				className="DirectoryAside lg:w-64 lg:shrink-0 pt-2"
			>
				<nav className="AdminNav flex min-h-full flex-col gap-6">
					<div data-l="NavBrand">
						<h1 className=" text-xl font-medium text-SC tracking-wider">
							Modular{" "}
							<span className="text-SC [font-size:1em]">
								Headless
							</span>{" "}
							CMS
							<span className="block text-GR [font-size:0.75em]">
								inspired by microCMS.
							</span>
						</h1>
						<p className="mt-2 text-sm ">
							{readOnly
								? "閲覧専用です。入力内容は保存・公開されません。"
								: "フィールドを追加・保存し、サイトやアプリで取得します。"}
						</p>
					</div>

					<div data-l="NavMain" className="space-y-4">
						<div className="flex items-center justify-between gap-2">
							<p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
								Directory
							</p>
							<button
								type="button"
								className="inline-flex items-end gap-2 rounded-full border border-SC/50 px-3 py-1 text-xs text-SC transition hover:bg-SC hover:text-WH"
								onClick={handleAddDirectory}
							>
								<FolderPlus size={20} />
								作成
							</button>
						</div>
						<ul className="space-y-2">
							{directories.map((directory) => {
								const isActive =
									directory.id === activeDirectory?.id;
								const DirectoryIcon = isActive
									? FolderOpen
									: Folder;
								return (
									<li key={directory.id}>
										<div
											role="button"
											tabIndex={0}
											className={`relative w-full rounded-md border p-1 pr-10 text-left text-sm transition ${
												isActive
													? "border-SC/60 bg-SC/15"
													: "border-TR  hover:bg-WH"
											}`}
											onClick={() =>
												setActiveDirectoryId(
													directory.id,
												)
											}
											onKeyDown={(event) => {
												if (
													event.key === "Enter" ||
													event.key === " "
												) {
													event.preventDefault();
													setActiveDirectoryId(
														directory.id,
													);
												}
											}}
										>
											<div className="flex items-center gap-2">
												<DirectoryIcon
													size={32}
													className="shrink-0 text-SC"
												/>
												<div className="min-w-0 flex-1">
													<span className="group relative block">
														<input
															className="w-full rounded bg-transparent text-sm outline-none transition focus:bg-WH focus:text-TC"
															value={
																directory.name
															}
															onChange={(event) =>
																handleRenameDirectory(
																	directory.id,
																	event.target
																		.value,
																)
															}
															onClick={(event) =>
																event.stopPropagation()
															}
															onKeyDown={(
																event,
															) =>
																event.stopPropagation()
															}
															aria-label="ディレクトリ名"
														/>
														<span className="pointer-events-none absolute left-0 top-full z-20 mt-1 whitespace-nowrap rounded bg-SC px-2 py-1 text-xs text-WH opacity-0 shadow group-hover:opacity-100 group-focus-within:opacity-100">
															名称を変更できます
														</span>
													</span>
													<span className="mt-1 block text-xs text-GR">
														{
															directory.prefixes
																.length
														}{" "}
														fields
													</span>
												</div>
											</div>
											{isActive &&
											directories.length > 1 ? (
												<button
													type="button"
													className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-AC/50 bg-transparent text-SC transition hover:bg-AC/50"
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();
														setPendingDirectoryDelete(
															directory,
														);
													}}
													aria-label={`${directory.name} を削除`}
													title="ディレクトリを削除"
												>
													<X
														size={16}
														aria-hidden="true"
														weight="bold"
													/>
												</button>
											) : null}
										</div>
									</li>
								);
							})}
						</ul>
					</div>
					<div
						data-l=""
						className="mt-auto space-y-2 pt-4"
                                        >
                                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                                                Media
							</p>
						<button
							type="button"
							className="w-full py-3 bg-WH border border-TC/20 hover:bg-SC/10 transition"
							aria-label="Media Library"
							onClick={() => {
								setLibraryAssetsReady(false);
								setLibraryReloadToken((current) => current + 1);
								setIsLibraryOpen(true);
							}}
						>
							Library
						</button>
					</div>

					{showLogout ? (
						<div
							data-l="NavAccount"
							className="space-y-2 border-t border-TC/10 pt-4"
						>
							<p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
								Account
							</p>
							<LogoutButton authProvider={authProvider} />
						</div>
					) : null}
				</nav>
			</aside>

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
								className={`font-bold text-sm ${
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
						<p className="text-sm text-GR">
							フィールドはまだありません。左のパネルから追加してください。
						</p>
					) : visibleGroups.length === 0 ? (
						<p className="text-sm text-GR">
							このディレクトリにはフィールドがありません。左のパネルから追加してください。
						</p>
					) : (
						<div className="min-w-0 border-t border-TC/20">
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
			<dialog
				data-l="LibraryModal"
				className={`content-center fixed inset-0 z-50 m-0 h-screen max-h-none w-screen max-w-none border-0 bg-transparent p-4 backdrop-blur-sm transition-opacity duration-300 ${
					isLibraryOpen ? "grid" : "hidden"
				} ${
					isLibraryOpen && libraryAssetsReady
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
					className={`mx-auto  flex w-full max-w-5xl flex-col overflow-hidden border border-TC/20 bg-WH/95 shadow-xl transition-opacity duration-300 ${
						isLibraryOpen && libraryAssetsReady
							? "opacity-100"
							: "opacity-0"
					}`}
				>
					<div className="flex items-center justify-between border-b border-TC/20 px-5 py-4">
						<div className="min-w-0 flex-1">
							<p className="text-lg font-semibold text-TC">
								メディアライブラリ
							</p>
							{/* <p className="text-sm text-GR">
									登録済みの画像から選択します。
								</p> */}
						</div>
						<div className="ml-4 flex items-center gap-2">
							<MediaUploadZone
								siteId={siteId}
								compact
								buttonLabel="画像アップロード"
								onBatchComplete={handleLibraryUploadComplete}
							/>
							<button
								type="button"
								className="rounded-full text-sm font-medium transition disabled:cursor-not-allowed px-4 py-2 border border-SC/50 bg-WH text-SC hover:bg-SC hover:text-WH disabled:opacity-60"
								onClick={() => setIsLibraryOpen(false)}
								aria-label="閉じる"
							>
								閉じる
							</button>
						</div>
					</div>
					<div className="relative max-h-[80vh] overflow-y-auto px-5 py-6">
						{/* <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center p-5">
								<input
									className="pointer-events-auto w-full max-w-2xl border-0 bg-WH/90 px-4 py-2 text-sm text-GR outline-none ring-1 ring-TC/10 focus:ring-2 focus:ring-SC/30"
									type="text"
									value={libraryDescription}
									onChange={(event) =>
										setLibraryDescription(event.target.value)
									}
									aria-label="メディアライブラリの説明"
								/>
							</div> */}
						<MediaLibraryBrowser
							siteId={siteId}
							readOnly
							allowDelete={!readOnly}
							reloadToken={libraryReloadToken}
							onAssetsReadyChange={setLibraryAssetsReady}
						/>
					</div>
				</div>
			</dialog>
			{pendingDirectoryDelete ? (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-TC/30 p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="DirectoryDeleteDialogTitle"
				>
					<div className="w-full max-w-sm rounded-md border border-TC/20 bg-WH p-5 shadow-xl">
						<h2
							id="DirectoryDeleteDialogTitle"
							className="text-base font-bold text-TC"
						>
							ディレクトリを削除しますか？
						</h2>
						<p className="mt-2 text-sm text-GR">
							{pendingDirectoryDelete.name}{" "}
							を削除します。中のフィールドは先頭のディレクトリへ移動します。
						</p>
						<div className="mt-5 flex justify-end gap-2">
							<button
								type="button"
								className="rounded-md border border-TC/20 px-3 py-2 text-sm text-TC transition hover:bg-TC/5"
								onClick={() => setPendingDirectoryDelete(null)}
							>
								キャンセル
							</button>
							<button
								type="button"
								className="inline-flex items-center gap-1 rounded-md border border-AC/40 bg-AC px-3 py-2 text-sm font-bold text-WH transition hover:bg-AC/80"
								onClick={handleConfirmDeleteDirectory}
							>
								削除
							</button>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
