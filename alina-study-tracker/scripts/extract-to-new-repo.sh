#!/usr/bin/env bash
#
# Moves this app out into its own standalone git repository.
#
# It was developed inside the LFMSV3.0 repo only because the automation that
# built it could not create a new GitHub repo. Nothing here depends on the
# parent repo, so extracting it is just a copy.
#
# Usage:
#   1. Create an EMPTY repo on GitHub (no README, no .gitignore, no licence).
#   2. From inside the alina-study-tracker folder, run:
#
#        ./scripts/extract-to-new-repo.sh git@github.com:YOURNAME/alina-study-tracker.git
#
#      ...or with an HTTPS url:
#
#        ./scripts/extract-to-new-repo.sh https://github.com/YOURNAME/alina-study-tracker.git
#
set -euo pipefail

REMOTE="${1:-}"
if [[ -z "$REMOTE" ]]; then
  echo "error: pass the new repo's git URL as the first argument." >&2
  echo "  usage: $0 <git-remote-url> [target-dir]" >&2
  exit 1
fi

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${2:-$(dirname "$SRC")/alina-study-tracker-standalone}"

if [[ -e "$DEST" ]]; then
  echo "error: $DEST already exists. Remove it or pass a different target dir." >&2
  exit 1
fi

echo "Copying $SRC -> $DEST"
mkdir -p "$DEST"

# Copy everything except build output, dependencies and any local env file.
tar -C "$SRC" \
    --exclude='./node_modules' \
    --exclude='./.next' \
    --exclude='./.git' \
    --exclude='./.vercel' \
    --exclude='./.env' \
    --exclude='./.env.local' \
    -cf - . | tar -C "$DEST" -xf -

cd "$DEST"
git init -b main
git add -A
git commit -m "Study tracker for SSC 2026 candidate

Offline-first Next.js app: teachers and coaching schedule, calendar study
logs, syllabus progress, homework, exam results, study timer, fees and
daily routines. Optional Supabase cloud sync."

git remote add origin "$REMOTE"

echo
echo "Done. Now run:"
echo "  cd $DEST"
echo "  git push -u origin main"
echo
echo "Then import the repo at https://vercel.com/new — no build settings to change."
