#!/usr/bin/env bash
set -euo pipefail

# Dumps the full database to a single gzipped archive via mongodump.
# Requires MONGODB_URL (see .env.example) and the MongoDB Database Tools
# (mongodump) on PATH:
#   macOS:   brew install mongodb-database-tools
#   Ubuntu:  see .github/workflows/backup.yml for the apt repo setup
#
# Usage: MONGODB_URL=... ./backupDb.sh [output-dir]
# The Atlas free/shared tier this project runs on doesn't include Atlas's
# own continuous-backup feature (that's M10+ only) — this script plus the
# weekly backup.yml workflow is the actual backup strategy. See
# Docs/OPERATIONS.md for the full runbook, including restore steps.

if [ -z "${MONGODB_URL:-}" ]; then
  echo "MONGODB_URL is not set" >&2
  exit 1
fi

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
ARCHIVE="$OUT_DIR/sharetruck-$TIMESTAMP.archive.gz"

mongodump --uri="$MONGODB_URL" --archive="$ARCHIVE" --gzip

echo "Backup written to $ARCHIVE"
