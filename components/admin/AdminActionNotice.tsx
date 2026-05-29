'use client';

interface AdminActionNoticeProps {
  kind: 'success' | 'error';
  message: string;
}

export function AdminActionNotice({ kind, message }: AdminActionNoticeProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={`AdminActionNotice rounded-2xl border px-4 py-3 text-sm ${
        kind === 'success'
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
          : 'border-rose-400/30 bg-rose-400/10 text-rose-100'
      }`}
      role="status"
    >
      {message}
    </p>
  );
}
