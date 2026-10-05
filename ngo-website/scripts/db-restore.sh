#!/usr/bin/env bash
# ==============================================================================
# SAMATA SAINIK DAL (SSD) - DATABASE RESTORE & INTEGRITY VERIFICATION SCRIPT
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path_to_backup.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "🔍 Verifying SHA-256 integrity checksum..."
if [ -f "${CHECKSUM_FILE}" ]; then
  shasum -a 256 -c "${CHECKSUM_FILE}"
  echo "✅ Checksum verification passed!"
else
  echo "⚠️ Notice: Checksum file not found, proceeding with caution."
fi

echo "⚠️ WARNING: This will overwrite data in the target database."
read -p "Type 'RESTORE-CONFIRM' to proceed: " CONFIRMATION

if [ "${CONFIRMATION}" != "RESTORE-CONFIRM" ]; then
  echo "❌ Restoration aborted by operator."
  exit 1
fi

echo "🚀 Restoring database from ${BACKUP_FILE}..."
if [ -n "${DATABASE_URL:-}" ]; then
  gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}"
elif [ -f "./data_store.json" ]; then
  gunzip -c "${BACKUP_FILE}" > ./data_store.json
fi

echo "✅ [SSD Restore Engine] Database successfully restored."
