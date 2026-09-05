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

ELIGIBILITY_RESPONSE="$(rpc_post "customer_buyer_eligible_company_id")"
ELIGIBLE_COMPANY_ID="$(printf '%s' "${ELIGIBILITY_RESPONSE}" | jq -r 'if type == "string" and . != "" then . else empty end')"
if [[ -n "${ELIGIBLE_COMPANY_ID}" && "${ELIGIBLE_COMPANY_ID}" != "null" ]]; then
  echo "Certification buyer already has governed company context: ${ELIGIBLE_COMPANY_ID}"
  exit 0
fi

BUSINESS_NAME="${BUYER_CERT_BUSINESS_NAME:-BUYER MOBILE GOLDEN PATH CERTIFICATION}"
GST_NUMBER="${BUYER_CERT_GST_NUMBER:-99MOBCT0001CZ5}"
CONTACT_EMAIL="${CERT_EMAIL:-buyer-mobile-cert@oasis-disposable.test}"

SUBMIT_PAYLOAD="$(jq -n \
  --arg businessName "${BUSINESS_NAME}" \
  --arg gstNumber "${GST_NUMBER}" \
  --arg contactPerson "Buyer Mobile Certification" \
  --arg contactEmail "${CONTACT_EMAIL}" \
  --arg mobileNumber "9999999999" \
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
SUBMIT_ERROR="$(printf '%s' "${SUBMIT_RESPONSE}" | jq -r '.message // .error // .code // empty')"
APPLICATION_ID="$(printf '%s' "${SUBMIT_RESPONSE}" | jq -r '.[0].application_id // empty')"
APPLICATION_STATUS="$(printf '%s' "${SUBMIT_RESPONSE}" | jq -r '.[0].application_status // empty')"

if [[ -n "${SUBMIT_ERROR}" && -z "${APPLICATION_ID}" ]]; then
  echo "Governed trade-application submit failed for certification buyer ${USER_ID}: ${SUBMIT_ERROR}" >&2
  exit 1
fi

echo "Governed trade application ensured for certification buyer ${USER_ID}: application=${APPLICATION_ID} status=${APPLICATION_STATUS}"
echo "HUMAN GATE — Central staff must approve this pending application via approve_b2b_trade_application_v1 (Oasis Central → Admin → Clients) before customer_statement_v1 can pass."
