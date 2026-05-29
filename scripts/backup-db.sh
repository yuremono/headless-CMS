#!/usr/bin/env bash
# PostgreSQL logical backup via pg_dump.
# Reads DATABASE_URL from .env / .env.local in the project root.
# Output: tmp/backups/headless_cms-YYYYMMDD-HHMMSS.dump

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

load_dotenv() {
  local file="$1"
  [[ -f "$file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue

    local key="${BASH_REMATCH[1]}"
    local val="${BASH_REMATCH[2]}"
    val="${val#"${val%%[![:space:]]*}"}"
    val="${val%"${val##*[![:space:]]}"}"

    if [[ "$val" == \"*\" && "$val" == *\" ]]; then
      val="${val:1:${#val}-2}"
    elif [[ "$val" == \'*\' && "$val" == *\' ]]; then
      val="${val:1:${#val}-2}"
    fi

    export "$key=$val"
  done < "$file"
}

load_dotenv ".env"
load_dotenv ".env.local"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "error: DATABASE_URL is not set. Add it to .env or .env.local." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "error: pg_dump not found. Install PostgreSQL client tools." >&2
  exit 1
fi

BACKUP_DIR="$ROOT/tmp/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="$BACKUP_DIR/headless_cms-${TIMESTAMP}.dump"

echo "Backing up to $OUTPUT_FILE ..."
pg_dump "$DATABASE_URL" -Fc --no-owner --no-acl -f "$OUTPUT_FILE"

echo "Done: $OUTPUT_FILE ($(du -h "$OUTPUT_FILE" | awk '{print $1}'))"
