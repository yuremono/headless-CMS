import type { ReactNode } from "react";
import { writeFieldValue } from "@/components/admin-data/admin-api";
import {
	buildRepeatableArrayValue,
	type ComposableFieldFormat,
	type ComposableFieldGroup,
	type ComposableFieldRow,
	restoreGroupsFromData,
} from "@/lib/admin/field-type-catalog";

export interface ComposableFieldDirectory {
	id: string;
	name: string;
	prefixes: string[];
}

export interface ComposableFieldDirectories {
	directories: ComposableFieldDirectory[];
	activeDirectoryId?: string;
}

type ManualMarkdownBlock =
	| { type: "heading"; text: string }
	| { type: "list"; items: string[] }
	| { type: "paragraph"; text: string };

export function renderManualMarkdown(markdown: string): ReactNode[] {
	const blocks: ManualMarkdownBlock[] = [];
	let paragraph: string[] = [];
	let list: string[] = [];

	function flushParagraph() {
		if (paragraph.length === 0) return;
		blocks.push({ type: "paragraph", text: paragraph.join(" ") });
		paragraph = [];
	}

	function flushList() {
		if (list.length === 0) return;
		blocks.push({ type: "list", items: list });
		list = [];
	}

	for (const rawLine of markdown.split(/\r?\n/)) {
		const line = rawLine.trim();

		if (!line) {
			flushParagraph();
			flushList();
			continue;
		}

		const heading = line.match(/^###\s+(.+)$/);
		if (heading) {
			flushParagraph();
			flushList();
			blocks.push({ type: "heading", text: heading[1] ?? "" });
			continue;
		}

		const listItem = line.match(/^[-*]\s+(.+)$/);
		if (listItem) {
			flushParagraph();
			list.push(listItem[1] ?? "");
			continue;
		}

		flushList();
		paragraph.push(line);
	}

	flushParagraph();
	flushList();

	return blocks.map((block, index) => {
		const key = `${block.type}-${index}`;

		if (block.type === "heading") {
			return (
				<h3 key={key} className="font-bold text-TC">
					{block.text}
				</h3>
			);
		}

		if (block.type === "list") {
			return (
				<ul key={key} className="list-disc space-y-1 pl-5 leading-6 text-GR">
					{block.items.map((item, itemIndex) => (
						<li key={`${key}-${itemIndex}`}>{item}</li>
					))}
				</ul>
			);
		}

		return (
			<p key={key} className="leading-6 text-GR">
				{block.text}
			</p>
		);
	});
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

export const DEFAULT_DIRECTORY_ID = "default";
export const DEFAULT_DIRECTORY_NAME = "Default";

export function createGroupId(): string {
	return `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDirectoryId(): string {
	return `directory-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getGroupPrefix(group: ComposableFieldGroup): string {
	return group.prefix.trim();
}

export function uniqueStrings(values: string[]): string[] {
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

export function hydrateDirectories(
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

export function serializeDirectories(
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

export function readFieldValue(data: Record<string, unknown>, path: string): string {
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

export function buildGroupsFromDefinitions(
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

export function mergeGroupsWithDefinitions(
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

export function collectComposableFieldDefinitions(
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

export function mergeDataForSave(
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
