import { buildPreviewUrl } from "@/lib/preview";
import type { ContentKind } from "@/components/admin-data/admin-data-types";

interface PreviewLinkProps {
  siteId: string;
  contentType: string;
  kind: ContentKind;
  contentId?: string;
  slug?: string;
  className?: string;
}

const defaultClassName =
  "PreviewLink rounded-full border border-violet-400/40 bg-violet-400/10 px-5 py-3 text-sm font-medium text-violet-100 transition hover:bg-violet-400/20";

export function PreviewLink({ siteId, contentType, kind, contentId, slug, className }: PreviewLinkProps) {
  const href = buildPreviewUrl({ siteId, contentType, kind, contentId, slug });
  const mergedClassName = className ?? defaultClassName;

  if (!href) {
    return (
      <span
        className={`${mergedClassName} cursor-not-allowed opacity-60`}
        title="FRONTEND_BASE_URL またはプレビュートークンが未設定です"
      >
        プレビュー（未設定）
      </span>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={mergedClassName}>
      プレビューを開く
    </a>
  );
}
