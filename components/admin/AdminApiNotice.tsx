interface AdminApiNoticeProps {
  source: 'api' | 'demo';
  error?: string;
  endpoint?: string;
}

export function AdminApiNotice({ source, error, endpoint }: AdminApiNoticeProps) {
  if (source === 'api' && !error) {
    return null;
  }

  const isDemo = source === 'demo';

  return (
    <div
      className={`AdminApiNotice rounded-2xl border px-4 py-3 text-sm ${
        isDemo
          ? 'border-amber-400/30 bg-amber-400/10 text-amber-100'
          : 'border-rose-400/30 bg-rose-400/10 text-rose-100'
      }`}
      role="status"
    >
      {isDemo ? (
        <p>
          API からデータを取得できなかったため、開発用デモデータを表示しています。
          {error ? ` (${error})` : null}
        </p>
      ) : (
        <p>{error ?? 'API リクエストに失敗しました。'}</p>
      )}
      {endpoint ? <p className="mt-1 text-xs opacity-80">endpoint: {endpoint}</p> : null}
    </div>
  );
}
