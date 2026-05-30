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
			className={`AdminActionNotice rounded-md border px-4 py-3 text-sm ${
				kind === "success"
					? "border-third/60 bg-fourth/50 text-BK"
					: "border-AC/70 bg-AC/35 text-BK"
			}`}
			role="status"
		>
			{message}
		</p>
  );
}
