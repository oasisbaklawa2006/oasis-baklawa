#!/usr/bin/env bash
set -euo pipefail

SESSION_FILE="${BUYER_CERT_SESSION_FILE:-/tmp/oasis-buyer-mobile-cert-session.json}"

fail_gate() {
  echo "HUMAN GATE — authenticated Buyer Mobile golden-path certification is blocked." >&2
  echo "Configure repository secrets:" >&2
  echo "  - BUYER_CERT_EMAIL" >&2
  echo "  - BUYER_CERT_PASSWORD" >&2
  echo "  - EXPO_PUBLIC_SUPABASE_URL" >&2
  echo "  - EXPO_PUBLIC_SUPABASE_ANON_KEY" >&2
  echo "Skipped authentication is NOT PASS for Tranche-5 closure." >&2
  exit 1
}

cleanup() {
  rm -f "${SESSION_FILE}"
  unset BUYER_CERT_PASSWORD || true
}
trap cleanup EXIT

SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}"
CERT_EMAIL="${BUYER_CERT_EMAIL:-}"
CERT_PASSWORD="${BUYER_CERT_PASSWORD:-}"

if [[ -z "${SUPABASE_URL}" || -z "${SUPABASE_ANON_KEY}" || -z "${CERT_EMAIL}" || -z "${CERT_PASSWORD}" ]]; then
  fail_gate
fi

AUTH_PAYLOAD="$(jq -n --arg email "${CERT_EMAIL}" --arg pass "${CERT_PASSWORD}" '{email: $email, password: $pass}')"
unset CERT_PASSWORD BUYER_CERT_PASSWORD

AUTH_RESPONSE="$(
  curl -sS -X POST "${SUPABASE_URL%/}/auth/v1/token?grant_type=password" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    --data "${AUTH_PAYLOAD}"
)"

ACCESS_TOKEN="$(printf '%s' "${AUTH_RESPONSE}" | jq -r '.access_token // empty')"
REFRESH_TOKEN="$(printf '%s' "${AUTH_RESPONSE}" | jq -r '.refresh_token // empty')"
USER_ID="$(printf '%s' "${AUTH_RESPONSE}" | jq -r '.user.id // empty')"
AUTH_ERROR="$(printf '%s' "${AUTH_RESPONSE}" | jq -r '.error_description // .msg // .message // empty')"

if [[ -z "${ACCESS_TOKEN}" || -z "${USER_ID}" ]]; then
  echo "Authentication failed during session materialization.${AUTH_ERROR:+ ${AUTH_ERROR}}" >&2
  exit 1
fi

jq -n \
  --arg supabaseUrl "${SUPABASE_URL}" \
  --arg anonKey "${SUPABASE_ANON_KEY}" \
  --arg accessToken "${ACCESS_TOKEN}" \
  --arg refreshToken "${REFRESH_TOKEN}" \
  --arg userId "${USER_ID}" \
  '{
    supabaseUrl: $supabaseUrl,
    anonKey: $anonKey,
    accessToken: $accessToken,
    refreshToken: $refreshToken,
    userId: $userId
  }' > "${SESSION_FILE}"

chmod 600 "${SESSION_FILE}"
trap - EXIT

echo "BUYER_CERT_SESSION_FILE=${SESSION_FILE}"
