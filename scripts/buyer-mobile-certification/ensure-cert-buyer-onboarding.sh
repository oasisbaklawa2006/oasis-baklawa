#!/usr/bin/env bash
set -euo pipefail

# Governed buyer onboarding for the synthetic certification identity.
# Uses only customer-safe RPCs allowed in the Buyer Mobile boundary:
#   - customer_buyer_eligible_company_id (read)
#   - submit_b2b_trade_application_v1 (one-time/idempotent submit)
# Staff approval remains Central-owned via approve_b2b_trade_application_v1.

SESSION_FILE="${BUYER_CERT_SESSION_FILE:-/tmp/oasis-buyer-mobile-cert-session.json}"

if [[ ! -f "${SESSION_FILE}" ]]; then
  echo "ensure-cert-buyer-onboarding: session artifact missing; skipping onboarding ensure." >&2
  exit 0
fi

SUPABASE_URL="$(jq -r '.supabaseUrl' "${SESSION_FILE}")"
ANON_KEY="$(jq -r '.anonKey' "${SESSION_FILE}")"
ACCESS_TOKEN="$(jq -r '.accessToken' "${SESSION_FILE}")"
USER_ID="$(jq -r '.userId' "${SESSION_FILE}")"
CERT_EMAIL="${BUYER_CERT_EMAIL:-}"

rpc_post() {
  local rpc="$1"
  local payload="${2:-{}}"
  curl -sS -X POST "${SUPABASE_URL%/}/rest/v1/rpc/${rpc}" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "${payload}"
}

read_own_pending_applications() {
  curl -sS -G "${SUPABASE_URL%/}/rest/v1/b2b_applications" \
    --data-urlencode "user_id=eq.${USER_ID}" \
    --data-urlencode "status=eq.pending" \
    --data-urlencode "select=id,status,resolved_company_id,business_name,mobile_number,contact_email" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}"
}

derive_cert_mobile() {
  if [[ -n "${BUYER_CERT_MOBILE_NUMBER:-}" ]]; then
    printf '%s' "${BUYER_CERT_MOBILE_NUMBER}"
    return
  fi
  # Stable synthetic mobile per certification Auth user; avoids shared placeholder collisions.
  local suffix
  suffix="$(printf '%s' "${USER_ID}" | tr -d '-' | md5sum | awk '{print substr($1,1,9)}')"
  printf '9%s' "${suffix}"
}

parse_submit_response() {
  local response="$1"
  APPLICATION_ID=""
  APPLICATION_STATUS=""
  IS_DUPLICATE="false"
  SUBMIT_ERROR=""

  if jq -e 'type == "array" and length > 0' <<<"${response}" >/dev/null 2>&1; then
    APPLICATION_ID="$(jq -r '.[0].application_id // empty' <<<"${response}")"
    APPLICATION_STATUS="$(jq -r '.[0].application_status // empty' <<<"${response}")"
    IS_DUPLICATE="$(jq -r '.[0].is_duplicate_submission // false' <<<"${response}")"
    return 0
  fi

  if jq -e 'type == "object" and has("application_id")' <<<"${response}" >/dev/null 2>&1; then
    APPLICATION_ID="$(jq -r '.application_id // empty' <<<"${response}")"
    APPLICATION_STATUS="$(jq -r '.application_status // empty' <<<"${response}")"
    IS_DUPLICATE="$(jq -r '.is_duplicate_submission // false' <<<"${response}")"
    return 0
  fi

  SUBMIT_ERROR="$(jq -r '[.message, .details, .hint, .code] | map(select(. != null and . != "")) | unique | join(" — ")' <<<"${response}")"
  return 1
}

ELIGIBILITY_RESPONSE="$(rpc_post "customer_buyer_eligible_company_id")"
ELIGIBLE_COMPANY_ID="$(printf '%s' "${ELIGIBILITY_RESPONSE}" | jq -r 'if type == "string" and . != "" and . != "null" then . else empty end')"
if [[ -n "${ELIGIBLE_COMPANY_ID}" ]]; then
  echo "Certification buyer already has governed company context: ${ELIGIBLE_COMPANY_ID}"
  exit 0
fi

PENDING_BEFORE="$(read_own_pending_applications)"
echo "Certification buyer pending-application census (before ensure): ${PENDING_BEFORE}"

BUSINESS_NAME="${BUYER_CERT_BUSINESS_NAME:-BUYER MOBILE GOLDEN PATH CERTIFICATION}"
GST_NUMBER="${BUYER_CERT_GST_NUMBER:-99MOBCT0001CZ5}"
CONTACT_EMAIL="${CERT_EMAIL:-buyer-mobile-cert@oasis-disposable.test}"
CERT_MOBILE="$(derive_cert_mobile)"

SUBMIT_PAYLOAD="$(jq -n \
  --arg businessName "${BUSINESS_NAME}" \
  --arg gstNumber "${GST_NUMBER}" \
  --arg contactPerson "Buyer Mobile Certification" \
  --arg contactEmail "${CONTACT_EMAIL}" \
  --arg mobileNumber "${CERT_MOBILE}" \
  --arg city "Certification City" \
  --arg registeredAddress "Synthetic certification buyer — not a production customer." \
  --argjson tradeDeclaration true \
  --argjson dataConsent true \
  '{
    p_business_name: $businessName,
    p_gst_number: $gstNumber,
    p_contact_person: $contactPerson,
    p_contact_email: $contactEmail,
    p_mobile_number: $mobileNumber,
    p_city: $city,
    p_registered_address: $registeredAddress,
    p_trade_declaration: $tradeDeclaration,
    p_data_consent: $dataConsent
  }')"

SUBMIT_RESPONSE="$(rpc_post "submit_b2b_trade_application_v1" "${SUBMIT_PAYLOAD}")"
if ! parse_submit_response "${SUBMIT_RESPONSE}"; then
  echo "Governed trade-application submit failed for certification buyer ${USER_ID}." >&2
  echo "submit_b2b_trade_application_v1 response: ${SUBMIT_ERROR:-unknown error}" >&2
  echo "Raw response shape: $(jq -r 'type' <<<"${SUBMIT_RESPONSE}")" >&2
  exit 1
fi

PENDING_AFTER="$(read_own_pending_applications)"
echo "Certification buyer pending-application census (after ensure): ${PENDING_AFTER}"

if [[ -z "${APPLICATION_ID}" ]]; then
  echo "Governed trade-application submit returned no application_id for certification buyer ${USER_ID}." >&2
  exit 1
fi

echo "Governed trade application ensured for certification buyer ${USER_ID}: application=${APPLICATION_ID} status=${APPLICATION_STATUS} duplicate=${IS_DUPLICATE} mobile=${CERT_MOBILE}"
echo "Central visibility keys: b2b_applications.user_id=${USER_ID} status=pending (Staff read all applications / is_internal_staff)."
