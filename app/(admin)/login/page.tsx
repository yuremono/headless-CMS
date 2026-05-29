import { LoginForm } from '../../../components/admin/LoginForm';
import { adminDemoCredentials } from '../../../components/admin/AdminData';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Headless CMS</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">管理画面へログイン</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Phase 1 の簡易ログイン画面です。環境変数で切り替えられるデモ用アカウントを使い、
            ダッシュボードからサイト概要とコンテンツ管理に進みます。
          </p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</dt>
              <dd className="mt-2 text-sm text-white">{adminDemoCredentials.email}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Password</dt>
              <dd className="mt-2 text-sm text-white">{adminDemoCredentials.password}</dd>
            </div>
          </dl>
        </section>

        <LoginForm email={adminDemoCredentials.email} password={adminDemoCredentials.password} redirectTo="/" />
      </div>
    </main>
  );
}
