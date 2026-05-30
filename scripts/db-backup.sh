#!/usr/bin/env bash
# Simple MySQL dump backup script with 24-hour retention
# Usage: set env vars DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, BACKUP_DIR (optional)

set -euo pipefail

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-}
DB_NAME=${DB_NAME:-}
BACKUP_DIR=${BACKUP_DIR:-./data/db-backups}
RETENTION_HOURS=${RETENTION_HOURS:-24}

mkdir -p "$BACKUP_DIR"

TS=$(date +"%Y-%m-%dT%H-%M-%S")
OUT="$BACKUP_DIR/db-$TS.sql.gz"

echo "Backing up $DB_NAME to $OUT"

if [ -z "$DB_NAME" ]; then
  echo "DB_NAME is required" >&2
  exit 2
fi

if [ -n "$DB_PASS" ]; then
  mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$OUT"
else
  mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" | gzip > "$OUT"
fi

echo "Backup written: $OUT"

# Remove backups older than retention (in hours)
find "$BACKUP_DIR" -type f -name "db-*.sql.gz" -mmin +$((RETENTION_HOURS*60)) -print -delete || true

echo "Old backups older than ${RETENTION_HOURS} hours removed."
