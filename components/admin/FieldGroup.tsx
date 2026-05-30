'use client';

import type { MouseEvent } from 'react';
import {
  createArrayItemFromTemplate,
  getFieldTypeLabel,
  migratePathsOnPrefixChange,
  supportsFormat,
  validatePrefix,
  type ComposableArrayItem,
  type ComposableFieldFormat,
  type ComposableFieldGroup,
  type ComposableFieldRow,
} from '@/lib/admin/field-type-catalog';
import {
	adminBtnDangerSm,
	adminBtnDangerXs,
	adminBtnEmeraldSm,
	adminBtnSkySm,
	adminBtnVioletXs,
	adminFieldControl,
	adminFieldControlTextarea,
	adminFormatBtn,
	adminFormatBtnActive,
	adminPanel,
	adminPanelInset,
	adminTintInfo,
} from "./admin-ui-classes";
import { ImageFieldInput } from './ImageFieldInput';
import { RichInlineEditor } from './RichInlineEditor';
import type { ImageFieldValue } from './admin-api';

interface FieldGroupProps {
  siteId: string;
  group: ComposableFieldGroup;
  sourceData: Record<string, unknown>;
  onChange: (group: ComposableFieldGroup) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  readOnly?: boolean;
}

function updateFieldRow(
  fields: ComposableFieldRow[],
  jsonPath: string,
  value: string,
): ComposableFieldRow[] {
  return fields.map((field) => (field.jsonPath === jsonPath ? { ...field, value } : field));
}

function updateFieldFormat(
  fields: ComposableFieldRow[],
  jsonPath: string,
  format: ComposableFieldFormat,
): ComposableFieldRow[] {
  return fields.map((field) => (field.jsonPath === jsonPath ? { ...field, format } : field));
}

function removeImageBundle(fields: ComposableFieldRow[]): ComposableFieldRow[] {
  return fields.filter((field) => field.bundle !== 'image');
}

function applyImageFieldValue(
  fields: ComposableFieldRow[],
  nextValue: ImageFieldValue,
): ComposableFieldRow[] {
  return fields.map((field) => {
    if (field.type === 'imageUrl') {
      return { ...field, value: nextValue.url };
    }
    if (field.type === 'imageAlt') {
      return { ...field, value: nextValue.alt };
    }
    return field;
  });
}

function createArrayItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function reindexArrayItems(
  fieldPrefix: string,
  items: ComposableArrayItem[],
): ComposableArrayItem[] {
  return items.map((item, index) => ({
    ...item,
    fields: item.fields.map((field) => ({
      ...field,
      jsonPath: `${fieldPrefix}.${index}.${field.suffix}`,
    })),
  }));
}

function isInteractiveSummaryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(
    target.closest('input, button, textarea, select, a, [contenteditable="true"]'),
  );
}

export function FieldGroup({
  siteId,
  group,
  sourceData,
  onChange,
  onRemove,
  onDuplicate,
  readOnly = false,
}: FieldGroupProps) {
  const prefixValidation = validatePrefix(group.prefix);

  function handleSummaryClick(event: MouseEvent<HTMLElement>) {
    if (isInteractiveSummaryTarget(event.target)) {
      event.preventDefault();
    }
  }

  function handlePrefixChange(nextPrefix: string) {
    const migratedFields = migratePathsOnPrefixChange(
      group.prefix,
      nextPrefix,
      group.fields,
      sourceData,
    );

    const migratedItems = group.repeatable
      ? reindexArrayItems(
          nextPrefix,
          (group.items ?? []).map((item, index) => ({
            ...item,
            fields: migratePathsOnPrefixChange(
              group.prefix,
              nextPrefix,
              item.fields.map((field) => ({
                ...field,
                jsonPath: `${nextPrefix}.${index}.${field.suffix}`,
              })),
              sourceData,
            ),
          })),
        )
      : group.items;

    onChange({
      ...group,
      prefix: nextPrefix,
      fields: migratedFields,
      items: migratedItems,
    });
  }

  function handleFieldChange(jsonPath: string, value: string) {
    onChange({
      ...group,
      fields: updateFieldRow(group.fields, jsonPath, value),
    });
  }

  function handleFormatChange(jsonPath: string, format: ComposableFieldFormat) {
    const nextTemplateFields = updateFieldFormat(group.fields, jsonPath, format);

    if (group.repeatable) {
      const items = group.items ?? [];
      const suffix = nextTemplateFields.find((field) => field.jsonPath === jsonPath)?.suffix;
      const nextItems = items.map((item) => ({
        ...item,
        fields: suffix
          ? item.fields.map((field) =>
              field.suffix === suffix ? { ...field, format } : field,
            )
          : item.fields,
      }));

      onChange({
        ...group,
        fields: nextTemplateFields,
        items: nextItems,
      });
      return;
    }

    onChange({
      ...group,
      fields: nextTemplateFields,
    });
  }

  function handleAddArrayItem() {
    const items = group.items ?? [];
    const nextItem = createArrayItemFromTemplate(
      group.prefix,
      items.length,
      group.fields,
      {},
      {},
      createArrayItemId,
    );

    onChange({
      ...group,
      items: [...items, nextItem],
    });
  }

  function handleRemoveArrayItem(itemId: string) {
    const items = (group.items ?? []).filter((item) => item.id !== itemId);
    onChange({
      ...group,
      items: reindexArrayItems(group.prefix, items),
    });
  }

  function handleArrayItemFieldChange(itemId: string, jsonPath: string, value: string) {
    const items = (group.items ?? []).map((item) =>
      item.id === itemId
        ? { ...item, fields: updateFieldRow(item.fields, jsonPath, value) }
        : item,
    );

    onChange({ ...group, items });
  }

  function handleRemoveBundle() {
    onChange({
      ...group,
      fields: removeImageBundle(group.fields),
    });
  }

  const scalarFields = group.fields.filter((field) => field.bundle !== 'image');
  const imageBundleFields = group.fields.filter((field) => field.bundle === 'image');
  const hasImageBundle = imageBundleFields.length > 0;

  function renderFieldInput(
    field: ComposableFieldRow,
    value: string,
    onValueChange: (next: string) => void,
  ) {
    const isRich = supportsFormat(field.type) && field.format === 'richText';

    if (isRich) {
      return (
        <RichInlineEditor
          value={value}
          onChange={onValueChange}
          readOnly={readOnly}
          ariaLabel={field.jsonPath}
        />
      );
    }

    if (field.type === 'text') {
      return (
			<textarea
				className={adminFieldControlTextarea}
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				disabled={readOnly}
				readOnly={readOnly}
			/>
		);
    }

    return (
		<input
			className={adminFieldControl}
			type={
				field.type === "imageUrl" || field.type === "href"
					? "url"
					: "text"
			}
			value={value}
			onChange={(event) => onValueChange(event.target.value)}
			disabled={readOnly}
			readOnly={readOnly}
		/>
	);
  }

  function renderScalarField(
    field: ComposableFieldRow,
    fieldIndex: number,
    showFormatToggle: boolean,
    onValueChange: (jsonPath: string, value: string) => void,
  ) {
    const isRich = supportsFormat(field.type) && field.format === 'richText';

    return (
		<div key={field.jsonPath} data-l={`FieldItem${fieldIndex + 1}`}>
			<div
				data-l="FieldHeader"
				className="flex flex-wrap items-center justify-between gap-2"
			>
				<p className="text-xs text-GR">
					{getFieldTypeLabel(field.type)} ·{" "}
					<span className="font-mono">{field.jsonPath}</span>
				</p>
				{showFormatToggle && supportsFormat(field.type) && !readOnly ? (
					<div
						data-l="FormatToggle"
						className="flex items-center gap-1 text-xs"
						role="group"
						aria-label="形式"
					>
						<button
							type="button"
							className={
								!isRich ? adminFormatBtnActive : adminFormatBtn
							}
							onClick={() =>
								handleFormatChange(field.jsonPath, "plain")
							}
						>
							プレーン
						</button>
						<button
							type="button"
							className={
								isRich ? adminFormatBtnActive : adminFormatBtn
							}
							onClick={() =>
								handleFormatChange(field.jsonPath, "richText")
							}
						>
							リッチ
						</button>
					</div>
				) : null}
			</div>
			{renderFieldInput(field, String(field.value ?? ""), (next) =>
				onValueChange(field.jsonPath, next),
			)}
		</div>
	);
  }

  function renderImageBundleForFields(
    fields: ComposableFieldRow[],
    onFieldsChange: (nextFields: ComposableFieldRow[]) => void,
    labelPrefix: string,
  ) {
    const bundleFields = fields.filter((field) => field.bundle === 'image');
    if (bundleFields.length === 0) {
      return null;
    }

    const urlField = bundleFields.find((field) => field.type === 'imageUrl');
    const altField = bundleFields.find((field) => field.type === 'imageAlt');
    const hrefFields = bundleFields.filter((field) => field.type === 'href');
    const bundleValue: ImageFieldValue = {
      url: String(urlField?.value ?? ''),
      alt: String(altField?.value ?? ''),
    };

    return (
		<div data-l="ImageBundle" className={`${adminTintInfo} p-4`}>
			<p className="text-sm font-medium text-WH">
				{labelPrefix}画像セット
			</p>
			<div data-l="BundleFields" className="mt-3 space-y-4">
				{urlField ? (
					<div data-l="BundleImage">
						<p className="text-xs text-GR">
							{getFieldTypeLabel("imageUrl")} ·{" "}
							<span className="font-mono">
								{urlField.jsonPath}
							</span>
							{altField ? (
								<>
									{" "}
									/{" "}
									<span className="font-mono">
										{altField.jsonPath}
									</span>
								</>
							) : null}
						</p>
						<ImageFieldInput
							siteId={siteId}
							label="画像"
							value={bundleValue}
							onChange={(nextValue) =>
								onFieldsChange(
									applyImageFieldValue(fields, nextValue),
								)
							}
							readOnly={readOnly}
						/>
					</div>
				) : null}
				{hrefFields.map((field, hrefIndex) => (
					<div
						key={field.jsonPath}
						data-l={`BundleField${hrefIndex + 1}`}
					>
						<p className="text-xs text-GR">
							{getFieldTypeLabel(field.type)} ·{" "}
							<span className="font-mono">{field.jsonPath}</span>
						</p>
						{renderFieldInput(
							field,
							String(field.value ?? ""),
							(next) => {
								onFieldsChange(
									updateFieldRow(
										fields,
										field.jsonPath,
										next,
									),
								);
							},
						)}
					</div>
				))}
			</div>
		</div>
	);
  }

  function renderArrayItemFields(item: ComposableArrayItem) {
    const itemScalars = item.fields.filter((field) => field.bundle !== 'image');

    return (
      <>
        {itemScalars.map((field, fieldIndex) =>
          renderScalarField(field, fieldIndex, false, (jsonPath, value) =>
            handleArrayItemFieldChange(item.id, jsonPath, value),
          ),
        )}
        {renderImageBundleForFields(item.fields, (nextFields) => {
          const items = (group.items ?? []).map((entry) =>
            entry.id === item.id ? { ...entry, fields: nextFields } : entry,
          );
          onChange({ ...group, items });
        }, '')}
      </>
    );
  }

  return (
		<details
			data-l="FieldGroup"
			className={`FieldGroup group ${adminPanel} p-4`}
			aria-label={`フィールド: ${group.prefix || "（Field name 未入力）"}`}
		>
			<summary
				data-l="GroupHeader"
				className="flex flex-wrap cursor-pointer list-none items-center gap-3"
				onClick={handleSummaryClick}
			>
				<span
					className="pointer-events-none shrink-0 rounded-lg border border-WH/20 p-1.5 text-GR"
					aria-hidden="true"
				>
					<svg
						className="block h-4 w-4 transition-transform duration-300 group-open:rotate-180"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z"
							clipRule="evenodd"
						/>
					</svg>
				</span>
				<div
					data-l="PrefixRow"
					className="flex min-w-[12rem] flex-1 flex-row items-center gap-3"
				>
					<span className="shrink-0 text-sm font-medium text-WH">
						Field name
					</span>
					<label className="min-w-0 flex-1">
						<input
							className={adminFieldControl}
							value={group.prefix}
							onChange={(event) =>
								handlePrefixChange(event.target.value)
							}
							placeholder="例: hero"
							disabled={readOnly}
							readOnly={readOnly}
						/>
						{!prefixValidation.valid ? (
							<p className="AdminFieldError">
								{prefixValidation.message}
							</p>
						) : null}
					</label>
				</div>
				{!readOnly ? (
					<>
						<button
							type="button"
							data-l="Duplicate"
							className={adminBtnSkySm}
							onClick={(event) => {
								event.preventDefault();
								onDuplicate?.();
							}}
						>
							複製
						</button>
						<button
							type="button"
							className={adminBtnDangerSm}
							onClick={(event) => {
								event.preventDefault();
								onRemove();
							}}
						>
							削除
						</button>
					</>
				) : null}
			</summary>

			<div data-l="GroupFields" className="mt-4 space-y-4">
				{group.repeatable ? (
					<p className="text-xs text-SC">
						繰り返しフィールド — 保存時は{" "}
						<span className="font-mono">
							{group.prefix || "…"}[]
						</span>{" "}
						として配列化されます。
					</p>
				) : null}

				{group.repeatable ? (
					<div
						data-l="ArrayTemplate"
						className={`space-y-4 ${adminTintInfo} p-4`}
					>
						<p className="text-sm font-medium text-WH">
							フィールド定義（テンプレート）
						</p>
						{scalarFields.map((field, fieldIndex) =>
							renderScalarField(
								field,
								fieldIndex,
								true,
								handleFieldChange,
							),
						)}
						{hasImageBundle
							? renderImageBundleForFields(
									group.fields,
									(nextFields) =>
										onChange({
											...group,
											fields: nextFields,
										}),
									"テンプレート ",
								)
							: null}
					</div>
				) : null}

				{group.repeatable ? (
					<div data-l="ArrayItems" className="space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<p className="text-sm font-medium text-WH">
								要素（{(group.items ?? []).length} 件）
							</p>
							{!readOnly ? (
								<button
									type="button"
									className={adminBtnDangerSm}
									onClick={handleAddArrayItem}
								>
									要素を追加
								</button>
							) : null}
						</div>

						{(group.items ?? []).length === 0 ? (
							<p className="text-sm text-GR">
								要素がありません。「要素を追加」で配列に入れます。
							</p>
						) : (
							(group.items ?? []).map((item, itemIndex) => (
								<div
									key={item.id}
									data-l={`ArrayItem${itemIndex + 1}`}
									className={`space-y-4 ${adminPanelInset} p-4`}
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<p className="text-sm font-medium text-WH">
											要素 {itemIndex + 1}
											<span className="ml-2 font-mono text-xs text-GR">
												{group.prefix}.{itemIndex}
											</span>
										</p>
										{!readOnly ? (
											<button
												type="button"
												className={adminBtnDangerXs}
												onClick={() =>
													handleRemoveArrayItem(
														item.id,
													)
												}
											>
												要素を削除
											</button>
										) : null}
									</div>
									{renderArrayItemFields(item)}
								</div>
							))
						)}
					</div>
				) : null}

				{!group.repeatable
					? scalarFields.map((field, fieldIndex) =>
							renderScalarField(
								field,
								fieldIndex,
								true,
								handleFieldChange,
							),
						)
					: null}

				{!group.repeatable && hasImageBundle ? (
					<div className="space-y-3">
						{renderImageBundleForFields(
							group.fields,
							(nextFields) =>
								onChange({ ...group, fields: nextFields }),
							"",
						)}
						{!readOnly ? (
							<button
								type="button"
								className={adminBtnVioletXs}
								onClick={handleRemoveBundle}
							>
								画像セットを削除
							</button>
						) : null}
					</div>
				) : null}
			</div>
		</details>
  );
}
