#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

fail() {
  echo "CORE BACKEND AUTHORITY VIOLATION: $*" >&2
  exit 1
}

# This consumer repository owns no database migration or Edge Function authority.
# Presence alone is a violation, independent of git diff shape.
if [[ -d supabase/migrations ]]; then
  migrations="$(find supabase/migrations -type f -name '*.sql' -print 2>/dev/null | sort || true)"
  [[ -z "$migrations" ]] || {
    echo "CORE BACKEND AUTHORITY VIOLATION: Supabase migrations are forbidden in oasis-baklawa:" >&2
    printf '%s\n' "$migrations" | sed 's/^/  /' >&2
    exit 1
  }
fi

if [[ -d supabase/functions ]]; then
  functions="$(find supabase/functions -type f -print 2>/dev/null | sort || true)"
  [[ -z "$functions" ]] || {
    echo "CORE BACKEND AUTHORITY VIOLATION: Supabase Edge Functions are forbidden in oasis-baklawa:" >&2
    printf '%s\n' "$functions" | sed 's/^/  /' >&2
    exit 1
  }
fi

# Also reject untracked/staged attempts before they are committed.
while IFS= read -r path; do
  case "$path" in
    supabase/migrations/*.sql|supabase/functions/*)
      fail "backend-owned path detected: $path; move it to oasisbaklawa2006/oasis-supabase-core"
      ;;
  esac
done < <(git ls-files --cached --others --exclude-standard)

echo "Core backend authority guard passed: oasis-baklawa contains no Supabase migration or Edge Function authority."
