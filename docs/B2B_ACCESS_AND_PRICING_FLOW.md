# B2B Access and Pricing Flow

## Decision

Keep MSG91 as the Indian mobile-verification provider, but do not embed the previous browser OTP widget inside the native Expo application.

The mobile app should use a server-mediated OTP contract:

1. App requests an OTP for a normalized mobile number.
2. A governed backend endpoint invokes MSG91 using server-held credentials.
3. App submits the OTP to a governed verification endpoint.
4. Backend verifies the code and returns a short-lived Supabase-compatible session exchange result.
5. Supabase session is persisted through mobile-safe storage.
6. Customer access state is resolved independently from authentication.

Email magic-link login remains a controlled fallback for already approved buyers until the native MSG91 contract is available.

## Public visitor experience

Visitors may access:

- Welcome and brand story
- About Oasis Baklawa
- Upcoming events
- Contact support
- Published catalogue discovery
- Product names, approved imagery and public descriptions

Visitors may not access:

- Buyer-specific pricing
- MOQ or commercial pack economics where private
- Cart or checkout
- Orders or dispatch tracking
- Account documents
- Buyer support history

Any restricted action routes the visitor to Login or Request Trade Access.

## Request Trade Access

The application captures:

- Legal business name
- Trade or outlet name
- Business type
- Contact person
- Mobile number
- Business email
- Registered address, city, state and pincode
- GST number and GST certificate
- Optional FSSAI number
- Business proof such as a visiting card, outlet image or supporting business document
- Trade declaration and data-processing consent

The production submission must use one governed registration command. The mobile client must not create auth profiles, company records, applications, notifications or storage rows directly.

## Backend review and urgency

A successful application command must atomically:

1. Create the pending access application.
2. Store private document references.
3. Emit an urgent approval work item or notification for the backend team.
4. Return an application reference and `pending` state.
5. Expose customer-safe status through a governed read contract.

While pending, the customer can continue public browsing and use Call or WhatsApp buyer-support actions for urgent access.

## Approval and price grade

Authentication and commercial authorization are separate.

Recommended access states:

- `anonymous`
- `authenticated_unregistered`
- `pending`
- `approved`
- `rejected`
- `suspended`

Approval assigns:

- Buyer category, such as trade retail, distributor, HORECA, corporate gifting or strategic account
- Price grade or price-list identifier
- Permitted catalogue visibility
- MOQ and increment policy
- Credit/payment terms where applicable
- Account owner and support route

The app must never calculate a price grade locally. Buyer pricing is returned only by the governed buyer-pricing contract after backend authorization.

## Required backend contracts

The remaining backend dependency should be delivered from the canonical backend authority, not this mobile repository:

- `request_customer_otp_v1`
- `verify_customer_otp_v1`
- `submit_b2b_access_application_v1`
- `customer_access_state_v1`
- Private signed-upload or upload-intent contract for application documents

Exact names may change during backend design, but ownership and boundaries must not.
