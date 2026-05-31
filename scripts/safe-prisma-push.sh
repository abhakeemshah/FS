#!/usr/bin/env bash
set -euo pipefail

# Safe wrapper: take a MySQL dump (if DATABASE_URL provided) then run prisma db push
# Usage: FS_USE_DB=true ./scripts/safe-prisma-push.sh

echo "Starting safe-prisma-push..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set. Aborting to avoid accidental operations." >&2
  exit 1
fi

echo "DATABASE_URL found. Preparing backup..."

# Parse DATABASE_URL (basic) expecting mysql://user:pass@host:port/dbname
proto="${DATABASE_URL%%://*}"
rest="${DATABASE_URL#*://}"
userpass="${rest%%@*}"
hostdb="${rest#*@}"
user="${userpass%%:*}"
pass="${userpass#*:}"
hostport="${hostdb%%/*}"
dbname="${hostdb#*/}"

host="${hostport%%:*}"
port="${hostport#*:}"
if [ "${port}" = "${hostport}" ]; then
  port=3306
fi

ts=$(date -u +"%Y%m%dT%H%M%SZ")
backup_dir="data/db-backups"
mkdir -p "$backup_dir"

dump_file="$backup_dir/db-backup-$ts.sql.gz"

echo "Dumping database to $dump_file"
mysqldump -u"$user" -p"$pass" -h"$host" -P"$port" "$dbname" 2>/dev/null | gzip > "$dump_file" || {
  echo "mysqldump failed. Aborting to avoid running prisma push without backup." >&2
  exit 2
}

echo "Backup created: $dump_file"

echo "Running npx prisma db push --preview-feature"
npx prisma db push

echo "Prisma push completed."
