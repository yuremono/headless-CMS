'use client';

import { useCallback, useRef, useState } from 'react';
import { adminFetch, type ApiAssetRecord } from './admin-api';
import { MEDIA_ACCEPT_ATTRIBUTE } from '@/lib/storage/media-types';

export interface MediaUploadResult {
  asset: ApiAssetRecord | null;
  filename: string;
  error?: string;
}

interface MediaUploadZoneProps {
  siteId: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  buttonLabel?: string;
  dropHint?: string;
  alt?: string;
  onUploadStart?: () => void;
  onUploadComplete?: (result: MediaUploadResult) => void;
  onBatchComplete?: (results: MediaUploadResult[]) => void;
}

function collectFiles(list: FileList | null): File[] {
  if (!list) {
    return [];
  }

  return Array.from(list);
}

export function MediaUploadZone({
  siteId,
  accept = MEDIA_ACCEPT_ATTRIBUTE,
  multiple = true,
  disabled = false,
  buttonLabel = 'メディアをアップロード',
  dropHint = 'ここにファイルをドラッグ&ドロップ、またはクリックして選択',
  alt,
  onUploadStart,
  onUploadComplete,
  onBatchComplete,
}: MediaUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState('');
  const [lastError, setLastError] = useState('');

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || disabled) {
        return;
      }

      setIsUploading(true);
      setLastError('');
      onUploadStart?.();

      const results: MediaUploadResult[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;
        setProgress(`${index + 1} / ${files.length}: ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);
        if (alt?.trim()) {
          formData.append('alt', alt.trim());
        }

        const result = await adminFetch<ApiAssetRecord>(`/api/admin/sites/${siteId}/assets`, {
          method: 'POST',
          body: formData,
        });

        const uploadResult: MediaUploadResult = {
          asset: result.ok ? result.data : null,
          filename: file.name,
          error: result.ok ? undefined : (result.error ?? 'アップロードに失敗しました。'),
        };

        results.push(uploadResult);
        onUploadComplete?.(uploadResult);
      }

      setIsUploading(false);
      setProgress('');

      const failed = results.filter((item) => item.error);
      if (failed.length === 1 && results.length === 1) {
        setLastError(failed[0]?.error ?? '');
      } else if (failed.length > 0) {
        setLastError(`${failed.length} 件のアップロードに失敗しました。`);
      }

      onBatchComplete?.(results);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [alt, disabled, onBatchComplete, onUploadComplete, onUploadStart, siteId],
  );

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);

    if (disabled) {
      return;
    }

    void uploadFiles(collectFiles(event.dataTransfer.files));
  }

  return (
    <div className="MediaUploadZone space-y-3">
      <div
        className={`MediaUploadZone_drop_zone rounded-2xl border border-dashed p-6 text-center transition ${
          isDragOver
            ? 'border-sky-400/70 bg-sky-400/10'
            : 'border-white/20 bg-slate-950/30 hover:border-white/30'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={dropHint}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabled && !isUploading) {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || isUploading}
          onChange={(event) => {
            void uploadFiles(collectFiles(event.target.files));
          }}
        />

        <p className="text-sm font-medium text-white">{isUploading ? 'アップロード中…' : buttonLabel}</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">{dropHint}</p>
        {multiple ? (
          <p className="mt-1 text-xs text-slate-500">複数ファイルの一括選択に対応しています。</p>
        ) : null}
        {progress ? <p className="mt-3 text-xs text-sky-200">{progress}</p> : null}
      </div>

      {lastError ? <p className="text-xs text-rose-300">{lastError}</p> : null}
    </div>
  );
}
