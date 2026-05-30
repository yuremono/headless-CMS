#!/usr/bin/env bash
# コード更新後の本番デプロイ（Vercel）。DB migrate / seed は含まない。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONT_ROOT="${FRONT_ROOT:-$ROOT/../0529headless-front}"
TARGET="${1:-cms}"

deploy_cms() {
  echo "==> Deploy CMS (production)"
  cd "$ROOT"
  npx vercel --prod --yes
}

deploy_front() {
  if [[ ! -d "$FRONT_ROOT" ]]; then
    echo "SKIP: front repo not found at $FRONT_ROOT"
    return 0
  fi
  echo "==> Deploy Front (production)"
  cd "$FRONT_ROOT"
  npm run config 2>/dev/null || true
  npx vercel --prod --yes
}

case "$TARGET" in
  cms)
    deploy_cms
    ;;
  front)
    deploy_front
    ;;
  all)
    deploy_cms
    deploy_front
    ;;
  *)
    echo "Usage: $0 [cms|front|all]"
    echo "  cms   — CMS のみ（既定）"
    echo "  front — 案件フロントのみ"
    echo "  all   — CMS + フロント"
    exit 1
    ;;
esac

echo "DONE ($TARGET)"
