#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/drizzle"
MIGRATIONS_TABLE="schema_migrations"
ENV_FILE=""
DATABASE_URL_OVERRIDE=""

usage() {
  cat <<'EOF'
Usage:
  scripts/run-migrations.sh [--env-file .dev.vars]
  scripts/run-migrations.sh --database-url 'postgresql://...'

Options:
  --env-file PATH       Source DATABASE_URL from an env file before running.
  --database-url URL    Use the provided DATABASE_URL directly.

Notes:
  - Migrations are applied from ./drizzle in filename order.
  - Applied migrations are tracked in the schema_migrations table.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --database-url)
      DATABASE_URL_OVERRIDE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -n "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Env file not found: $ENV_FILE" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DATABASE_URL="${DATABASE_URL_OVERRIDE:-${DATABASE_URL:-}}"

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is required. Pass --database-url or --env-file." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required but was not found in PATH." >&2
  exit 1
fi

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

echo "Ensuring migration tracking table exists..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
"

shopt -s nullglob
migration_files=("$MIGRATIONS_DIR"/*.sql)
shopt -u nullglob

if [[ ${#migration_files[@]} -eq 0 ]]; then
  echo "No migration files found in $MIGRATIONS_DIR"
  exit 0
fi

for migration_path in "${migration_files[@]}"; do
  migration_file="$(basename "$migration_path")"
  already_applied="$(
    psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 \
      -c "SELECT 1 FROM ${MIGRATIONS_TABLE} WHERE filename = '$migration_file' LIMIT 1;"
  )"

  if [[ "$already_applied" == "1" ]]; then
    echo "Skipping $migration_file"
    continue
  fi

  echo "Applying $migration_file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<EOF
BEGIN;
\i $migration_path
INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ('$migration_file');
COMMIT;
EOF
done

echo "Migrations complete."
