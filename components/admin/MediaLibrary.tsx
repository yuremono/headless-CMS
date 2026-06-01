'use client';

import { useAdminAccess } from './AdminAccessContext';
import { MediaLibraryBrowser } from './MediaLibraryBrowser';
import type { AssetCollection } from './admin-data-types';

interface MediaLibraryProps {
  siteId: string;
  initialAssets: AssetCollection;
}

export function MediaLibrary({ siteId, initialAssets }: MediaLibraryProps) {
  const { readOnly } = useAdminAccess();

  return (
    <MediaLibraryBrowser
      siteId={siteId}
      initialAssets={initialAssets}
      allowUpload={!readOnly}
      readOnly={readOnly}
    />
  );
}
