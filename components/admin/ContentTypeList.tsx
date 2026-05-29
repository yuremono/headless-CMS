'use client';

import Link from 'next/link';
import type { ContentRecord, ContentTypeDefinition } from './admin-data-types';
import { useAdminAccess } from './AdminAccessContext';

interface ContentTypeListProps {
  siteId: string;
  contentTypes: ContentTypeDefinition[];
  records: ContentRecord[];
}

export function ContentTypeList({ siteId, contentTypes, records }: ContentTypeListProps) {
  const { readOnly } = useAdminAccess();
  const countByType = new Map<string, number>();
  records.forEach((record) => {
    countByType.set(record.contentType, (countByType.get(record.contentType) ?? 0) + 1);
  });

  return (
    <section className="ContentTypeList grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {contentTypes.map((type) => (
        <article key={type.slug} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{type.kind}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{type.label}</h3>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
              {countByType.get(type.slug) ?? 0}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{type.description}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div>
              <dt className="text-slate-500">フィールド数</dt>
              <dd className="mt-1 font-medium text-white">{type.schemaJson.fields.length}</dd>
            </div>
            <div>
              <dt className="text-slate-500">セクション雛形</dt>
              <dd className="mt-1 font-medium text-white">{type.schemaJson.sectionTemplates?.length ?? 0}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/sites/${siteId}/contents/${type.slug}`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
              一覧を見る
            </Link>
            {!readOnly ? (
              <Link href={`/sites/${siteId}/contents/${type.slug}/new`} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white">
                新規作成
              </Link>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
