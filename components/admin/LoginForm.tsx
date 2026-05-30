'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { CmsAuthProvider } from '../../lib/auth/production-config';
import { authProviderLabel } from '../../lib/auth/production-config';
import { ADMIN_DEV_SESSION_TOKEN, adminFetch, hasPersistedAdminSession, persistAdminSession } from './admin-api';

interface LoginFormProps {
  email: string;
  password: string;
  redirectTo: string;
  sessionToken?: string;
  authProvider?: CmsAuthProvider;
}

export function LoginForm({
  email,
  password,
  redirectTo,
  sessionToken = ADMIN_DEV_SESSION_TOKEN,
  authProvider = 'none',
}: LoginFormProps) {
  const router = useRouter();
  const [formEmail, setFormEmail] = useState(email);
  const [formPassword, setFormPassword] = useState(password);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (hasPersistedAdminSession()) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

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
        router.push(redirectTo);
        return;
      }

      if (formEmail === email && formPassword === password) {
        persistAdminSession(sessionToken);
        router.push(redirectTo);
        return;
      }

      setMessage('メールアドレスまたはパスワードが一致しません。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
		<form
			className="LoginForm space-y-5  border border-white/10 bg-white/5 p-6 shadow-xl shadow-slate-950/20"
			onSubmit={handleSubmit}
		>
			<div>
				<h2 className="text-2xl font-semibold text-white">ログイン</h2>
				<p className="mt-2 text-sm text-slate-300">
					MVP 用の簡易ログインです。成功時に `x-session-token`
					用セッションを保存し、管理 API リクエストへ付与します。
				</p>
				{authProvider !== "none" ? (
					<p className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-xs leading-5 text-sky-100">
						本番認証プロバイダ: {authProviderLabel(authProvider)}
					</p>
				) : null}
			</div>

			<label className="block">
				<span className="text-sm font-medium text-white">
					メールアドレス
				</span>
				<input
					className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
					value={formEmail}
					onChange={(event) => setFormEmail(event.target.value)}
					placeholder="admin@example.com"
				/>
			</label>

			<label className="block">
				<span className="text-sm font-medium text-white">
					パスワード
				</span>
				<input
					className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
					type="password"
					value={formPassword}
					onChange={(event) => setFormPassword(event.target.value)}
					placeholder="admin1234"
				/>
			</label>

			{message ? (
				<p className="rounded-2xl border border-AC/20 bg-AC/10 px-4 py-3 text-sm text-rose-100">
					{message}
				</p>
			) : null}

			<button
				type="submit"
				disabled={submitting}
				className="w-full rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
			>
				{submitting ? "ログイン中…" : "ログイン"}
			</button>

			<p className="text-xs leading-5 text-slate-500">
				デフォルト値は `<code>{email}</code>` / `<code>{password}</code>
				` です。
			</p>
		</form>
  );
}
