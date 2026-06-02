import { LoginForm } from '@/components/admin-layout/LoginForm';
import { getAuthProvider } from '@/lib/auth/production-config';

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect?.startsWith('/') ? params.redirect : '/';
  const authProvider = getAuthProvider();
  const email = process.env.ADMIN_DEMO_EMAIL ?? 'admin@example.com';
  const readonlyPassword = process.env.ADMIN_READONLY_PASSWORD ?? process.env.ADMIN_DEMO_PASSWORD ?? '';
  const editorPassword = process.env.ADMIN_EDITOR_PASSWORD ?? process.env.ADMIN_DEMO_PASSWORD ?? '';

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-TC">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="border border-TC/20 bg-WH p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-GR">Headless CMS</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-TC">管理画面へログイン</h1>
          <p className="mt-4 text-sm leading-7 text-GR">
            閲覧専用または編集権限でログインします。
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="border border-TC/20 bg-TC10 p-4">
              <dt className="text-xs uppercase tracking-[0.2em] text-GR">Email</dt>
              <dd className="mt-2 text-sm text-TC">{email}</dd>
            </div>
            <div className="border border-TC/20 bg-TC10 p-4">
              <dt className="text-xs uppercase tracking-[0.2em] text-GR">Role</dt>
              <dd className="mt-2 text-sm text-TC">閲覧専用:view</dd>
            </div>
          </dl>
        </section>

        <LoginForm
          email={email}
          readonlyPassword={readonlyPassword}
          editorPassword={editorPassword}
          redirectTo={redirectTo}
          authProvider={authProvider}
        />
      </div>
    </main>
  );
}
