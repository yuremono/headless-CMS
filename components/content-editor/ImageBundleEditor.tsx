"use client";

import type { ImageFieldValue } from "@/components/admin-data/admin-api";
import { ImageFieldInput } from "@/components/media-library/ImageFieldInput";
import type { ComposableFieldRow } from "@/lib/admin/field-type-catalog";

interface ImageBundleEditorProps {
	fields: ComposableFieldRow[];
	labelPrefix: string;
	siteId: string;
	sourceData: Record<string, unknown>;
	readOnly: boolean;
	onFieldsChange: (fields: ComposableFieldRow[]) => void;
}

function applyImageBundleValue(
	fields: ComposableFieldRow[],
	nextValue: ImageFieldValue,
): ComposableFieldRow[] {
	return fields.map((field) => {
		if (field.type === "imageUrl") {
			return { ...field, value: nextValue.url };
		}

		if (field.type === "imageAlt") {
			return { ...field, value: nextValue.alt };
		}

		return field;
	});
}

export function ImageBundleEditor({
	fields,
	labelPrefix,
	siteId,
	readOnly,
	onFieldsChange,
}: ImageBundleEditorProps) {
	const bundleFields = fields.filter((field) => field.bundle === "image");
	const urlField = bundleFields.find((field) => field.type === "imageUrl");
	const altField = bundleFields.find((field) => field.type === "imageAlt");
	const hrefFields = bundleFields.filter((field) => field.type === "href");
	const bundleValue: ImageFieldValue = {
		url: String(urlField?.value ?? ""),
		alt: String(altField?.value ?? ""),
	};

	return (
 <div data-l="ImageBundle" className="TintInfo p-4">
			<p className="font-bold text-TC">{labelPrefix}画像セット</p>
			<div data-l="BundleFields" className="mt-3 space-y-4">
				<div data-l="BundleImage">
					<ImageFieldInput
						siteId={siteId}
						label={`${labelPrefix}画像`}
						value={bundleValue}
						onChange={(nextValue) =>
							onFieldsChange(applyImageBundleValue(fields, nextValue))
						}
						readOnly={readOnly}
					/>
				</div>
				{hrefFields.map((field) => (
					<label key={field.jsonPath} className="block space-y-1">
						<span className="text-xs font-bold uppercase tracking-widest text-SC/60">
							{field.suffix}
						</span>
						<input
							className="w-full rounded-md border border-TC/20 bg-WH px-3 py-2 text-TC outline-none transition focus:border-SC"
							type="text"
							value={String(field.value ?? "")}
							onChange={(event) =>
								onFieldsChange(
									fields.map((current) =>
										current.jsonPath === field.jsonPath
											? { ...current, value: event.target.value }
											: current,
									),
								)
							}
							disabled={readOnly}
						/>
					</label>
				))}
			</div>
		</div>
	);
}
