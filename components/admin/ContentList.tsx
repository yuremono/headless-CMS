'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdminActionNotice } from './AdminActionNotice';
import { adminFetch, mapApiContentRecord, type ApiContentRecord } from './admin-api';
import type { ContentRecord, ContentTypeDefinition } from './admin-data-types';

interface ContentListProps {
  siteId: string;
  contentType: ContentTypeDefinition;
  records: ContentRecord[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function ContentList({ siteId, contentType, records }: ContentListProps) {
  const [items, setItems] = useState(records);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'all' | 'draft' | 'published' | 'unpublished'>('all');
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success');
  const [isPending, setIsPending] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const keywordMatch =
        keyword.trim().length === 0 ||
        [item.title, item.slug, item.summary, item.author].some((text) => text.toLowerCase().includes(keyword.toLowerCase()));
      const statusMatch = status === 'all' || item.status === status;
      return keywordMatch && statusMatch;
    });
  }, [items, keyword, status]);

  async function mutateRecord(
    record: ContentRecord,
    action: 'duplicate' | 'delete' | 'publish' | 'unpublish',
  ) {
    setIsPending(true);
    setMessage('');

    const actionPaths: Record<typeof action, string> = {
      duplicate: `/api/admin/sites/${siteId}/content/${contentType.slug}/${record.id}/duplicate`,
      publish: `/api/admin/sites/${siteId}/content/${contentType.slug}/${record.id}/publish`,
      unpublish: `/api/admin/sites/${siteId}/content/${contentType.slug}/${record.id}/unpublish`,
      delete: `/api/admin/sites/${siteId}/content/${contentType.slug}/${record.id}`,
    };

    const method = action === 'delete' ? 'DELETE' : 'POST';

    const response = await adminFetch<ApiContentRecord>(actionPaths[action], { method });

    if (!response.ok) {
      setMessageKind('error');
      setMessage(`API エラー: ${response.error ?? `HTTP ${response.status}`}`);
      setIsPending(false);
      return;
    }

    if (action === 'delete') {
      setItems((current) => current.filter((item) => item.id !== record.id));
      setMessageKind('success');
      setMessage('削除しました。');
      setIsPending(false);
      return;
    }

    if (action === 'duplicate') {
      const duplicated = response.data ? mapApiContentRecord(response.data) : null;
      if (duplicated) {
        setItems((current) => [duplicated, ...current]);
      }
      setMessageKind('success');
      setMessage('複製しました。');
      setIsPending(false);
      return;
    }

    const updated = response.data ? mapApiContentRecord(response.data) : record;
    setItems((current) => current.map((item) => (item.id === record.id ? updated : item)));
    setMessageKind('success');
    setMessage(action === 'publish' ? '公開しました。' : '非公開にしました。');
    setIsPending(false);
  }

  if (contentType.kind === 'single') {
    const current = filtered[0] ?? null;

    return (
      <section className="ContentList space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">single</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{contentType.label}</h3>
            <p className="mt-2 text-sm text-slate-300">単一ページとして編集します。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/sites/${siteId}/contents/${contentType.slug}/new`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
              新規作成
            </Link>
          </div>
        </div>

        {current ? (
          <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h4 className="text-xl font-semibold text-white">{current.title}</h4>
                <p className="mt-2 text-sm text-slate-300">{current.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-white/10 px-3 py-1">{current.status}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">{current.author}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">{formatDate(current.updatedAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/sites/${siteId}/contents/${contentType.slug}/${current.id}`} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white">
                  編集
                </Link>
                <button
                  type="button"
                  className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100"
                  onClick={() => void mutateRecord(current, 'publish')}
                  disabled={isPending || current.status === 'published'}
                >
                  公開
                </button>
                {current.status === 'published' ? (
                  <button
                    type="button"
                    className="rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100"
                    onClick={() => void mutateRecord(current, 'unpublish')}
                    disabled={isPending}
                  >
                    非公開
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-slate-300">
            まだコンテンツがありません。新規作成から入力してください。
          </div>
        )}

        <AdminActionNotice kind={messageKind} message={message} />
      </section>
    );
  }

  return (
    <section className="ContentList space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">collection</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{contentType.label}</h3>
          <p className="mt-2 text-sm text-slate-300">キーワード検索、ステータス絞り込み、削除、公開をここで操作できます。</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/sites/${siteId}/contents/${contentType.slug}/new`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
            新規作成
          </Link>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
        <input
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="タイトル・スラッグ・要約で検索"
        />
        <select
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          <option value="all">すべて</option>
          <option value="draft">下書き</option>
          <option value="published">公開中</option>
          <option value="unpublished">非公開</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-slate-950/60 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">タイトル</th>
              <th className="px-4 py-3 font-medium">スラッグ</th>
              <th className="px-4 py-3 font-medium">ステータス</th>
              <th className="px-4 py-3 font-medium">更新日</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-slate-950/40 text-slate-200">
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4">
                  <div className="font-medium text-white">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-400">{item.summary}</div>
                </td>
                <td className="px-4 py-4 text-slate-300">{item.slug}</td>
                <td className="px-4 py-4">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs">{item.status}</span>
                </td>
                <td className="px-4 py-4 text-slate-300">{formatDate(item.updatedAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/sites/${siteId}/contents/${contentType.slug}/${item.id}`} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white">
                      編集
                    </Link>
                    <button
                      type="button"
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-100"
                      onClick={() => void mutateRecord(item, 'duplicate')}
                      disabled={isPending}
                    >
                      複製
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => void mutateRecord(item, 'publish')}
                      disabled={isPending || item.status === 'published'}
                    >
                      公開
                    </button>
                    {item.status === 'published' ? (
                      <button
                        type="button"
                        className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100"
                        onClick={() => void mutateRecord(item, 'unpublish')}
                        disabled={isPending}
                      >
                        非公開
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-full border border-rose-400/40 bg-rose-400/10 px-3 py-1.5 text-xs font-medium text-rose-100"
                      onClick={() => void mutateRecord(item, 'delete')}
                      disabled={isPending}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>
                  条件に合うコンテンツがありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminActionNotice kind={messageKind} message={message} />
    </section>
  );
}
