#!/usr/bin/env bash
# Backs up the LEVIX MySQL database (reads DATABASE_URL from the environment or ./.env)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/levix-backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

if [ -z "${DATABASE_URL:-}" ] && [ -f ".env" ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set" >&2
  exit 1
fi

# mysql://user:pass@host:port/db
proto_removed="${DATABASE_URL#mysql://}"
userpass="${proto_removed%%@*}"
hostportdb="${proto_removed#*@}"
DB_USER="${userpass%%:*}"
DB_PASS="${userpass#*:}"
hostport="${hostportdb%%/*}"
DB_NAME="${hostportdb#*/}"; DB_NAME="${DB_NAME%%\?*}"
DB_HOST="${hostport%%:*}"
DB_PORT="${hostport#*:}"; [ "$DB_PORT" = "$hostport" ] && DB_PORT=3306

FILE="$BACKUP_DIR/levix_${DB_NAME}_${TIMESTAMP}.sql.gz"
MYSQL_PWD="$DB_PASS" mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --single-transaction --routines "$DB_NAME" | gzip > "$FILE"
echo "✓ Backup created: $FILE ($(du -h "$FILE" | cut -f1))"

find "$BACKUP_DIR" -type f -name "levix_*.sql.gz" -mtime +14 -delete
