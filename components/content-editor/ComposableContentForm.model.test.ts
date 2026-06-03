import { describe, expect, it } from "vitest";
import type { ComposableFieldGroup } from "@/lib/admin/field-type-catalog";
import {
	mergeDataForSave,
	mergeGroupsWithDefinitions,
} from "./ComposableContentForm.model";

describe("mergeGroupsWithDefinitions", () => {
	it("definition の field set を優先して stale field を落とす", () => {
		const dataGroups: ComposableFieldGroup[] = [
			{
				id: "group-data",
				prefix: "hero",
				fields: [
					{
						type: "title",
						suffix: "title",
						jsonPath: "hero.title",
						value: "Old title",
					},
					{
						type: "text",
						suffix: "text",
						jsonPath: "hero.text",
						value: "Old text",
					},
				],
			},
		];
		const definitionGroups: ComposableFieldGroup[] = [
			{
				id: "group-definition",
				prefix: "hero",
				fields: [
					{
						type: "title",
						suffix: "title",
						jsonPath: "hero.title",
						value: "",
					},
				],
			},
		];

		const merged = mergeGroupsWithDefinitions(dataGroups, definitionGroups);

		expect(merged[0]?.fields).toHaveLength(1);
		expect(merged[0]?.fields[0]).toMatchObject({
			suffix: "title",
			value: "Old title",
		});
	});

	it("repeatable item でも definition にない field を残さない", () => {
		const dataGroups: ComposableFieldGroup[] = [
			{
				id: "group-data",
				prefix: "cards",
				repeatable: true,
				fields: [
					{
						type: "title",
						suffix: "title",
						jsonPath: "cards.title",
						value: "",
					},
				],
				items: [
					{
						id: "item-1",
						fields: [
							{
								type: "title",
								suffix: "title",
								jsonPath: "cards.0.title",
								value: "Card 1",
							},
							{
								type: "text",
								suffix: "text",
								jsonPath: "cards.0.text",
								value: "Legacy body",
							},
						],
					},
				],
			},
		];
		const definitionGroups: ComposableFieldGroup[] = [
			{
				id: "group-definition",
				prefix: "cards",
				repeatable: true,
				fields: [
					{
						type: "title",
						suffix: "title",
						jsonPath: "cards.title",
						value: "",
					},
				],
				items: [],
			},
		];

		const merged = mergeGroupsWithDefinitions(dataGroups, definitionGroups);

		expect(merged[0]?.items?.[0]?.fields).toHaveLength(1);
		expect(merged[0]?.items?.[0]?.fields[0]).toMatchObject({
			suffix: "title",
			value: "Card 1",
		});
	});
});

describe("mergeDataForSave", () => {
	it("同一 prefix で消えた field path を削除する", () => {
		const result = mergeDataForSave(
			{
				hero: {
					title: "Old title",
					text: "Old text",
				},
			},
			[
				{
					id: "group-1",
					prefix: "hero",
					fields: [
						{
							type: "title",
							suffix: "title",
							jsonPath: "hero.title",
							value: "New title",
						},
					],
				},
			],
		);

		expect(result).toEqual({
			hero: {
				title: "New title",
			},
		});
	});
});
