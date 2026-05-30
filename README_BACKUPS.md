Backup setup and quick guide

What this provides
- A small backup script: `scripts/db-backup.sh` which creates a gzipped mysqldump into `./data/db-backups` by default.
- By default the script keeps backups for 24 hours (rotate by age).

How it works
- The script reads environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `BACKUP_DIR` (optional), `RETENTION_HOURS` (default 24).
- It writes files named `db-YYYY-MM-DDTHH-MM-SS.sql.gz` into the backup directory.
- It deletes files older than `RETENTION_HOURS`.

Quick example (Hostinger Cron setup)
1. Place the project on the server (already deployed).
2. Open Hostinger Control Panel -> Cron Jobs / Scheduled Tasks.
3. Add a new cron job with this command (every 15 minutes example):

*/15 * * * * cd /home/USER/path/to/project && DB_HOST=127.0.0.1 DB_USER=u121265836_admin DB_PASS='PASSWORD' DB_NAME=u121265836_adminnew BACKUP_DIR=./data/db-backups RETENTION_HOURS=24 ./scripts/db-backup.sh >> ./data/db-backups/cron.log 2>&1

Notes
- For Hostinger managed MySQL use the connection info shown in Control Panel (host, port, username, password, database name).
- The example runs every 15 minutes and keeps 24 hours of backups (96 files). Adjust cron and `RETENTION_HOURS` to taste.
- Consider also exporting backups to offsite storage (S3) for extra redundancy. I can add that next.
 - Offsite export: optional S3 upload helper is included as `scripts/db-backup-and-upload.sh`.

Hostinger Cron examples (replace placeholders):

Every 15 minutes (backup only):
*/15 * * * * cd /home/USER/path/to/project && DB_HOST=127.0.0.1 DB_USER=u121265836_admin DB_PASS='PASSWORD' DB_NAME=u121265836_admin BACKUP_DIR=./data/db-backups RETENTION_HOURS=24 ./scripts/db-backup.sh >> ./data/db-backups/cron.log 2>&1

Every 15 minutes (backup + upload to S3):
*/15 * * * * cd /home/USER/path/to/project && DB_HOST=127.0.0.1 DB_USER=u121265836_admin DB_PASS='PASSWORD' DB_NAME=u121265836_admin BACKUP_DIR=./data/db-backups RETENTION_HOURS=24 S3_BUCKET=my-bucket AWS_ACCESS_KEY_ID=XXX AWS_SECRET_ACCESS_KEY=YYY AWS_REGION=us-east-1 ./scripts/db-backup-and-upload.sh >> ./data/db-backups/cron.log 2>&1

Notes:
- Paste these lines into Hostinger Cron Jobs (Control Panel). Do NOT commit credentials to Git.
- The S3 option requires an IAM user with `s3:PutObject` permission to the chosen bucket.
- I can help produce the exact line if you paste the DB host, DB name, and the Hostinger project path (not secrets).

Restore
- Use the `src/scripts/restore-snapshot.ts` for app-level snapshot restores (catalog/ledger keys).
- To restore a full DB dump manually:

gunzip -c db-2026-05-29T03-31-51.sql.gz | mysql -h DB_HOST -P DB_PORT -u DB_USER -p'PASSWORD' DB_NAME
