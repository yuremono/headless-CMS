#!/usr/bin/env bash
# Supabase (dvcaumqooopebexajsdw) + Vercel CMS/フロント 一括セットアップ
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONT_ROOT="$(cd "$ROOT/../0529headless-front" && pwd)"
SUPABASE_REF="dvcaumqooopebexajsdw"
CMS_VERCEL_URL="https://headless-cms0529.vercel.app"
FRONT_VERCEL_URL="https://headless-front0529.vercel.app"

AUTH_SECRET="${AUTH_SECRET:-62cac86cb7be53e8cfa53a6e63409ea9693620506e8a98757a40de0caa81cfb8}"
PREVIEW_TOKEN_SECRET="${PREVIEW_TOKEN_SECRET:-ea9b1c8a195b1d14ef3f9b62de80277315e7cb12828f7e9bf6704b9ed64cc2b6}"

if [[ -f "$ROOT/.env.supabase.local" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env.supabase.local"
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "ERROR: SUPABASE_DB_PASSWORD が未設定です。"
  echo "  cp .env.supabase.local.example .env.supabase.local"
  echo "  DB パスワードを入れて再実行: https://supabase.com/dashboard/project/${SUPABASE_REF}/settings/database"
  exit 1
fi

ADMIN_DEMO_PASSWORD="${ADMIN_DEMO_PASSWORD:-HeadlessCMS-Demo-2026}"
# Direct (5432): ユーザー名は postgres。postgres.<ref> は Pooler 用
DIRECT_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_REF}.supabase.co:5432/postgres"
# Session pooler (5432) — Prisma + Vercel 向け（6543 transaction は prepared statement で不整合になりやすい）
POOLER_URL="postgresql://postgres.${SUPABASE_REF}:${SUPABASE_DB_PASSWORD}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

echo "==> PostgreSQL schema headless_cms（既存 public と共存）"
cd "$ROOT"
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "$DIRECT_URL" -c "CREATE SCHEMA IF NOT EXISTS headless_cms;" >/dev/null

echo "==> Prisma db push (Direct)"
export DATABASE_URL="$DIRECT_URL"
npx prisma db push --accept-data-loss

echo "==> Seed"
export ADMIN_DEMO_PASSWORD
export AUTH_SECRET
export PREVIEW_TOKEN_SECRET
export CMS_PUBLIC_API_KEY="${CMS_PUBLIC_API_KEY:-public-dev-key}"
npx tsx prisma/seed.ts

echo "==> topPage CONTENT_ID"
CONTENT_ID="$(PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "$DIRECT_URL" -t -A -c \
  "SELECT c.id FROM headless_cms.contents c
   JOIN headless_cms.content_models m ON c.model_id = m.id
   WHERE m.api_name = 'topPage' LIMIT 1;")"
if [[ -z "$CONTENT_ID" ]]; then
  echo "ERROR: topPage CONTENT_ID を取得できませんでした"
  exit 1
fi
echo "CONTENT_ID=$CONTENT_ID"

vercel_env() {
  local project_dir="$1"
  local name="$2"
  local value="$3"
  local env="${4:-production}"
  cd "$project_dir"
  npx vercel env rm "$name" "$env" --yes 2>/dev/null || true
  printf '%s' "$value" | npx vercel env add "$name" "$env" --yes
}

echo "==> Vercel CMS env"
vercel_env "$ROOT" DATABASE_URL "$POOLER_URL" production
# Preview は Git ブランチ指定が必要なため production のみ必須
vercel_env "$ROOT" APP_URL "$CMS_VERCEL_URL" production
vercel_env "$ROOT" APP_URL "$CMS_VERCEL_URL" preview
vercel_env "$ROOT" CMS_AUTH_PROVIDER authjs production
vercel_env "$ROOT" CMS_ENFORCE_ADMIN_LOGIN true production
vercel_env "$ROOT" PHASE3_ENFORCE_ROLES true production
vercel_env "$ROOT" AUTH_SECRET "$AUTH_SECRET" production
vercel_env "$ROOT" PREVIEW_TOKEN_SECRET "$PREVIEW_TOKEN_SECRET" production
vercel_env "$ROOT" ADMIN_DEMO_EMAIL admin@example.com production
vercel_env "$ROOT" ADMIN_READONLY_PASSWORD "${ADMIN_READONLY_PASSWORD:-view}" production
vercel_env "$ROOT" ADMIN_EDITOR_PASSWORD "${ADMIN_EDITOR_PASSWORD:-e06}" production
vercel_env "$ROOT" ADMIN_DEMO_PASSWORD "$ADMIN_DEMO_PASSWORD" production
vercel_env "$ROOT" CMS_PUBLIC_API_KEY public-dev-key production
vercel_env "$ROOT" STORAGE_PROVIDER local production
vercel_env "$ROOT" FRONTEND_BASE_URL "$FRONT_VERCEL_URL" production

echo "==> Vercel Front env"
vercel_env "$FRONT_ROOT" CMS_API_BASE_URL "$CMS_VERCEL_URL" production
vercel_env "$FRONT_ROOT" CMS_API_BASE_URL "$CMS_VERCEL_URL" preview
vercel_env "$FRONT_ROOT" SITE_ID main-site production
vercel_env "$FRONT_ROOT" SITE_ID main-site preview
vercel_env "$FRONT_ROOT" PUBLIC_API_KEY public-dev-key production
vercel_env "$FRONT_ROOT" PUBLIC_API_KEY public-dev-key preview
vercel_env "$FRONT_ROOT" CONTENT_TYPE topPage production
vercel_env "$FRONT_ROOT" CONTENT_TYPE topPage preview
vercel_env "$FRONT_ROOT" CONTENT_ID "$CONTENT_ID" production
vercel_env "$FRONT_ROOT" CONTENT_ID "$CONTENT_ID" preview

echo "==> Deploy CMS"
cd "$ROOT"
npx vercel --prod --yes

echo "==> Deploy Front"
cd "$FRONT_ROOT"
npm run config 2>/dev/null || true
npx vercel --prod --yes

echo "DONE: CMS $CMS_VERCEL_URL / Front $FRONT_VERCEL_URL / CONTENT_ID=$CONTENT_ID"
