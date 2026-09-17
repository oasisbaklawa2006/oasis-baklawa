// Identifier normalization, ported from Oasis-Baklawa-Central's src/lib/auth-identity.ts
// so native and Central classify/send identical identifiers to the shared
// buyer-login-gateway and MSG91 bridges.
export interface NormalizedPhone {
  digits: string;
  last10: string;
  national: string;
  e164: string;
  variants: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailIdentifier(value: string): boolean {
  return EMAIL_REGEX.test(value.trim().toLowerCase());
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizePhone(input: string, defaultCountryCode = "91"): NormalizedPhone {
  const digits = input.replace(/\D/g, "");
  const trimmedCountry = defaultCountryCode.replace(/\D/g, "") || "91";

  if (!digits) {
    return { digits: "", last10: "", national: "", e164: "", variants: [] };
  }

  const last10 = digits.slice(-10);
  const national = last10 || digits;
  const withCountry = national.length === 10 ? `${trimmedCountry}${national}` : digits;
  const e164 = withCountry.startsWith("+") ? withCountry : `+${withCountry}`;

  const variants = Array.from(
    new Set(
      [
        digits,
        national,
        withCountry,
        e164,
        `0${national}`,
        national.length === 10 ? `+${trimmedCountry}${national}` : null,
        national.length === 10 ? `${trimmedCountry}${national}` : null,
      ].filter(Boolean) as string[]
    )
  );

  return { digits, last10, national, e164, variants };
}
