#!/usr/bin/env bash
# Nightly backup of the findmyteammate database.
#
# Writes a gzipped pg_dump to /home/opc/backups and keeps the last 14.
# Installed by hand; see DEPLOY.md. Runs from root's crontab.
set -euo pipefail

DB=findmyteammate
OUT=/home/opc/backups
KEEP=14
STAMP=$(date +%F)
FILE="$OUT/${DB}-${STAMP}.sql.gz"

# Write to a temporary name first, so an interrupted run never leaves a
# truncated file that looks like a good backup.
TMP="${FILE}.partial"
su - postgres -c "pg_dump --no-owner --no-privileges $DB" | gzip -9 > "$TMP"

# A valid dump ends with the PostgreSQL completion marker.
if ! gzip -dc "$TMP" | tail -5 | grep -q "PostgreSQL database dump complete"; then
  echo "$(date -Is) FAILED: dump incomplete, keeping $TMP for inspection" >&2
  exit 1
fi

mv "$TMP" "$FILE"
chown opc:opc "$FILE"
chmod 600 "$FILE"

# Prune, oldest first, keeping the most recent $KEEP.
ls -1t "$OUT/${DB}-"*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  rm -f -- "$old"
  echo "$(date -Is) pruned $(basename "$old")"
done

echo "$(date -Is) ok $(basename "$FILE") $(du -h "$FILE" | cut -f1)"
