'use client';

import { useEffect, useState } from 'react';

interface AdminActionNoticeProps {
  kind: 'success' | 'error';
  message: string;
}

export function AdminActionNotice({ kind, message }: AdminActionNoticeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);
    const timerId = window.setTimeout(() => setVisible(false), 1500);
    return () => window.clearTimeout(timerId);
  }, [message]);

  if (!message || !visible) {
    return null;
  }

  return (
		<p
			className={`AdminActionNotice  font-bold text-sm ${
				kind === "success"
					? " text-SC"
					: " text-AC"
			}`}
			role="status"
		>
			{message}
		</p>
  );
}
