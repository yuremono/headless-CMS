'use client';

import { useState } from 'react';
import type { FieldDraftValue } from './admin-api';

export const SEO_FIELD_KEYS = [
  'seo.title',
  'seo.description',
  'seo.ogTitle',
  'seo.ogDescription',
  'seo.ogImage',
  'seo.canonicalUrl',
  'seo.noindex',
] as const;

export type SeoFieldKey = (typeof SEO_FIELD_KEYS)[number];

export interface SeoPayload {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonicalUrl: string;
  noindex: boolean;
}

export function isSeoFieldKey(key: string): key is SeoFieldKey {
  return (SEO_FIELD_KEYS as readonly string[]).includes(key);
}

function readOgImageValue(value: unknown): string {
  if (value && typeof value === 'object' && 'url' in value) {
    return String((value as { url: unknown }).url ?? '');
  }

  return typeof value === 'string' ? value : '';
}

export function readSeoDraftFromData(data: Record<string, unknown>): Record<SeoFieldKey, string | boolean> {
  const seo =
    data.seo && typeof data.seo === 'object' && !Array.isArray(data.seo)
      ? (data.seo as Record<string, unknown>)
      : {};

  return {
    'seo.title': String(seo.title ?? ''),
    'seo.description': String(seo.description ?? ''),
    'seo.ogTitle': String(seo.ogTitle ?? ''),
    'seo.ogDescription': String(seo.ogDescription ?? ''),
    'seo.ogImage': readOgImageValue(seo.ogImage),
    'seo.canonicalUrl': String(seo.canonicalUrl ?? ''),
    'seo.noindex': Boolean(seo.noindex),
  };
}

function readDraftString(value: FieldDraftValue | undefined): string {
  if (value && typeof value === 'object' && 'url' in value) {
    return String(value.url ?? '');
  }

  return String(value ?? '');
}

export function buildSeoPayloadFromDraft(draft: Record<string, FieldDraftValue>): SeoPayload {
  return {
    title: readDraftString(draft['seo.title']),
    description: readDraftString(draft['seo.description']),
    ogTitle: readDraftString(draft['seo.ogTitle']),
    ogDescription: readDraftString(draft['seo.ogDescription']),
    ogImage: readDraftString(draft['seo.ogImage']),
    canonicalUrl: readDraftString(draft['seo.canonicalUrl']),
    noindex: Boolean(draft['seo.noindex']),
  };
}

interface SeoFieldsProps {
  draft: Record<string, FieldDraftValue>;
  onChange: (key: string, value: FieldDraftValue) => void;
  defaultOpen?: boolean;
  readOnly?: boolean;
}

export function SeoFields({ draft, onChange, defaultOpen = false, readOnly = false }: SeoFieldsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const previewTitle = String(draft['seo.title'] ?? '').trim() || '（SEOタイトル未入力）';

  const inputClass =
		"mt-2 w-full rounded-md border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20";

  return (
		<div className="SeoFields lg:col-span-2">
			<header className="SeoFields_header">
				<button
					type="button"
					className="SeoFields_toggle flex w-full items-center gap-3 text-left"
					aria-expanded={isOpen}
					onClick={() => setIsOpen((current) => !current)}
				>
					<span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-xs text-violet-200">
						SEO
					</span>
					<span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
						{previewTitle}
					</span>
					<span className="text-xs text-slate-400">
						{isOpen ? "閉じる" : "開く"}
					</span>
				</button>
			</header>

			{isOpen ? (
				<div className="SeoFields_body">
					<div className="SeoFields_grid grid gap-5 lg:grid-cols-2">
						<label className="block">
							<span className="text-sm font-medium text-white">
								SEOタイトル
							</span>
							<input
								className={inputClass}
								value={String(draft["seo.title"] ?? "")}
								onChange={(event) =>
									onChange("seo.title", event.target.value)
								}
								placeholder="検索結果に表示されるタイトル"
								disabled={readOnly}
								readOnly={readOnly}
							/>
						</label>

						<label className="block">
							<span className="text-sm font-medium text-white">
								OGタイトル
							</span>
							<input
								className={inputClass}
								value={String(draft["seo.ogTitle"] ?? "")}
								onChange={(event) =>
									onChange("seo.ogTitle", event.target.value)
								}
								placeholder="SNS シェア時のタイトル"
								disabled={readOnly}
								readOnly={readOnly}
							/>
						</label>

						<label className="block lg:col-span-2">
							<span className="text-sm font-medium text-white">
								SEO説明
							</span>
							<textarea
								className={inputClass}
								rows={3}
								value={String(draft["seo.description"] ?? "")}
								onChange={(event) =>
									onChange(
										"seo.description",
										event.target.value,
									)
								}
								placeholder="検索結果に表示される説明文"
								disabled={readOnly}
								readOnly={readOnly}
							/>
						</label>

						<label className="block lg:col-span-2">
							<span className="text-sm font-medium text-white">
								OG説明
							</span>
							<textarea
								className={inputClass}
								rows={3}
								value={String(draft["seo.ogDescription"] ?? "")}
								onChange={(event) =>
									onChange(
										"seo.ogDescription",
										event.target.value,
									)
								}
								placeholder="SNS シェア時の説明文"
								disabled={readOnly}
								readOnly={readOnly}
							/>
						</label>

						<label className="block">
							<span className="text-sm font-medium text-white">
								OG画像
							</span>
							<input
								className={inputClass}
								value={String(draft["seo.ogImage"] ?? "")}
								onChange={(event) =>
									onChange("seo.ogImage", event.target.value)
								}
								placeholder="https://example.com/og.jpg"
								disabled={readOnly}
								readOnly={readOnly}
							/>
							<p className="mt-2 text-xs leading-5 text-slate-400">
								画像 URL を入力
							</p>
						</label>

						<label className="block">
							<span className="text-sm font-medium text-white">
								canonical URL
							</span>
							<input
								className={inputClass}
								type="url"
								value={String(draft["seo.canonicalUrl"] ?? "")}
								onChange={(event) =>
									onChange(
										"seo.canonicalUrl",
										event.target.value,
									)
								}
								placeholder="https://example.com/page"
								disabled={readOnly}
								readOnly={readOnly}
							/>
						</label>

						<div className="block lg:col-span-2">
							<span className="text-sm font-medium text-white">
								noindex
							</span>
							{readOnly ? (
								<p className="mt-2 rounded-md border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white lg:max-w-sm">
									{Boolean(draft["seo.noindex"])
										? "noindex"
										: "index"}
								</p>
							) : (
								<button
									type="button"
									className="mt-2 flex w-full items-center justify-between rounded-md border border-white/10 bg-slate-950/70 px-4 py-3 text-left text-sm text-white lg:max-w-sm"
									onClick={() =>
										onChange(
											"seo.noindex",
											!Boolean(draft["seo.noindex"]),
										)
									}
								>
									<span>
										{Boolean(draft["seo.noindex"])
											? "検索エンジンに索引しない"
											: "通常どおり索引する"}
									</span>
									<span
										className={`rounded-full px-3 py-1 text-xs ${Boolean(draft["seo.noindex"]) ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/20 text-emerald-200"}`}
									>
										{Boolean(draft["seo.noindex"])
											? "noindex"
											: "index"}
									</span>
								</button>
							)}
						</div>
					</div>
				</div>
			) : null}
		</div>
  );
}
