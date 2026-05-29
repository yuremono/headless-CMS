'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAccess } from './AdminAccessContext';
import { AdminActionNotice } from './AdminActionNotice';
import { adminFetch, type ApiCreateSiteResponse } from './admin-api';
import { siteRouteKey } from './admin-data-utils';

function previewSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return slug.length > 0 ? slug : 'site';
}

export function SiteCreateForm() {
  const { canManageSite } = useAdminAccess();
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdSite, setCreatedSite] = useState<ApiCreateSiteResponse | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(previewSlug(value));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
    };

    const result = await adminFetch<ApiCreateSiteResponse>('/api/admin/sites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!result.ok || !result.data) {
      setErrorMessage(result.error ?? 'サイトの作成に失敗しました。');
      return;
    }

    setCreatedSite(result.data);
    setName('');
    setSlug('');
    setSlugTouched(false);
    router.refresh();
  }

  if (!canManageSite) {
    return null;
  }

  if (createdSite) {
    const routeKey = siteRouteKey(createdSite.site);

    return (
      <section className="SiteCreateForm rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
        <AdminActionNotice kind="success" message={`「${createdSite.site.name}」を作成しました。API キーはこの画面でのみ表示されます。`} />
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">サイト ID</dt>
            <dd className="mt-1 break-all font-mono text-emerald-100">{createdSite.site.id}</dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">公開 API キー</dt>
            <dd className="mt-1 break-all font-mono text-emerald-100">{createdSite.apiKeys.public}</dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">管理 API キー</dt>
            <dd className="mt-1 break-all font-mono text-emerald-100">{createdSite.apiKeys.admin}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/sites/${routeKey}`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
            サイト概要へ
          </Link>
          <button
            type="button"
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white"
            onClick={() => setCreatedSite(null)}
          >
            続けて作成
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className="SiteCreateForm rounded-2xl border border-white/10 bg-slate-950/50 p-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <label className="block flex-1">
          <span className="text-sm font-medium text-white">サイト名</span>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="Client Site"
            required
          />
        </label>

        <label className="block flex-1">
          <span className="text-sm font-medium text-white">スラッグ</span>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder="client-site"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            title="小文字英数字とハイフンのみ"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || name.trim().length === 0}
          className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? '作成中…' : '新規サイト作成'}
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        コンテンツ種類 JSON を取り込み、公開・管理 API キーを発行します。スラッグは URL と API パスで使います。
      </p>

      {errorMessage ? (
        <div className="mt-3">
          <AdminActionNotice kind="error" message={errorMessage} />
        </div>
      ) : null}
    </form>
  );
}
