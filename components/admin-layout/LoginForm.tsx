'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { CmsAuthProvider } from '@/lib/auth/production-config';
import { authProviderLabel } from '@/lib/auth/production-config';
import {
  ADMIN_EDITOR_SESSION_TOKEN,
  ADMIN_READONLY_SESSION_TOKEN,
  adminFetch,
  hasPersistedAdminSession,
  persistAdminSession,
} from '@/components/admin-data/admin-api';

interface LoginFormProps {
  email: string;
  readonlyPassword: string;
  editorPassword: string;
  redirectTo: string;
  authProvider?: CmsAuthProvider;
}

export function LoginForm({
  email,
  readonlyPassword,
  editorPassword,
  redirectTo,
  authProvider = 'none',
}: LoginFormProps) {
  const router = useRouter();
  const [formEmail, setFormEmail] = useState(email);
  const [formPassword, setFormPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [initialSessionChecked, setInitialSessionChecked] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    router.prefetch(redirectTo);

    if (hasPersistedAdminSession()) {
      router.replace(redirectTo);
      return;
    }

    setInitialSessionChecked(true);
  }, [redirectTo, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);
    let shouldResetSubmitting = true;

    try {
      if (authProvider === 'authjs') {
        const result = await adminFetch<{ sessionToken: string }>('/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formEmail, password: formPassword }),
        });

        if (!result.ok || !result.data?.sessionToken) {
          setMessage(result.error ?? 'メールアドレスまたはパスワードが一致しません。');
          return;
        }

        persistAdminSession(result.data.sessionToken);
        shouldResetSubmitting = false;
        router.replace(redirectTo);
        return;
      }

      if (formEmail === email && formPassword === readonlyPassword) {
        persistAdminSession(ADMIN_READONLY_SESSION_TOKEN);
        shouldResetSubmitting = false;
        router.replace(redirectTo);
        return;
      }

      if (formEmail === email && formPassword === editorPassword) {
        persistAdminSession(ADMIN_EDITOR_SESSION_TOKEN);
        shouldResetSubmitting = false;
        router.replace(redirectTo);
        return;
      }

      setMessage('メールアドレスまたはパスワードが一致しません。');
    } finally {
      if (shouldResetSubmitting) {
        setSubmitting(false);
      }
    }
  }

	return (
    <form
      className={`LoginForm space-y-5 border border-TC/20 bg-WH p-6 shadow-sm transition-opacity duration-300 ${
        initialSessionChecked ? 'opacity-100' : 'opacity-0'
      }`}
      onSubmit={handleSubmit}
    >
      <div>
        <h2 className="text-2xl font-semibold text-TC">ログイン</h2>
        {authProvider !== 'none' ? (
          <p className="mt-3 rounded-md border border-TC/20 bg-TC10 px-4 py-3 text-xs leading-5 text-TC">
            本番認証プロバイダ: {authProviderLabel(authProvider)}
          </p>
        ) : null}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-TC">メールアドレス</span>
        <input
          className="mt-2 w-full rounded-md border border-TC/20 bg-WH px-4 py-3 text-sm text-TC outline-none placeholder:text-GR focus:border-SC/60 focus:ring-2 focus:ring-SC/20"
          value={formEmail}
          onChange={(event) => setFormEmail(event.target.value)}
          placeholder="admin@example.com"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-TC">パスワード</span>
        <input
          className="mt-2 w-full rounded-md border border-TC/20 bg-WH px-4 py-3 text-sm text-TC outline-none placeholder:text-GR focus:border-SC/60 focus:ring-2 focus:ring-SC/20"
          type="password"
          value={formPassword}
          onChange={(event) => setFormPassword(event.target.value)}
          placeholder="閲覧専用または編集権限のパスワード"
        />
      </label>

      {message ? (
        <p className="rounded-md border border-AC/20 bg-AC/10 px-4 py-3 text-sm text-rose-700">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="flex min-h-[46px] w-full items-center justify-center rounded-full border border-TC/15 bg-SC/10 px-5 py-3 text-sm font-medium text-TC transition hover:bg-SC/20 disabled:opacity-60"
        aria-busy={submitting}
      >
        {submitting ? (
          <span
            className="block h-5 w-5 animate-spin rounded-full border-2 border-TC/20 border-t-TC"
            aria-label="ログイン中"
            role="status"
          />
        ) : (
          'ログイン'
        )}
      </button>
    </form>
  );
}
