#!/usr/bin/env bash
# Backup then upload to S3 (optional). Requires AWS CLI configured via env vars:
# AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET

set -euo pipefail

ROOT_DIR=${ROOT_DIR:-$(pwd)}
BACKUP_SCRIPT=${BACKUP_SCRIPT:-"$ROOT_DIR/scripts/db-backup.sh"}
BACKUP_DIR=${BACKUP_DIR:-"$ROOT_DIR/data/db-backups"}
S3_BUCKET=${S3_BUCKET:-}

if [ ! -x "$BACKUP_SCRIPT" ]; then
  echo "Backup script not found or not executable: $BACKUP_SCRIPT" >&2
  exit 2
fi

echo "Running backup script..."
env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_REGION -u S3_BUCKET "$BACKUP_SCRIPT"

# find the most recent backup file
LATEST=$(ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | head -n 1 || true)
if [ -z "$LATEST" ]; then
  echo "No backup file found in $BACKUP_DIR" >&2
  exit 1
fi

if [ -z "$S3_BUCKET" ]; then
  echo "S3_BUCKET not set — skipping upload." >&2
  exit 0
fi

if [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ] || [ -z "${AWS_REGION:-}" ]; then
  echo "AWS credentials/region not set in env — skipping upload." >&2
  exit 0
fi

echo "Uploading $LATEST to s3://$S3_BUCKET/"
aws s3 cp "$LATEST" "s3://$S3_BUCKET/" --only-show-errors
echo "Upload complete"
