/**
 * Deep-link input guard. React Navigation 6 parses every incoming URL's query string with `query-string`, which uses
 * `decode-uri-component` (advisory: quadratic/exponential time on crafted percent-encoded input). A ~1.2 KB URL of repeated "%AA"
 * measured ~3 s and ~2.4 KB ~13 s (see docs/carton-builder/final/DEEP_LINK_SECURITY.md). Until React Navigation 7, reject abnormal URLs
 * before they reach the parser. Real links are short (`order/<uuid>/confirmation`).
 */
export const MAX_DEEP_LINK_LENGTH = 512;
export const MAX_PERCENT_ESCAPES = 24;

export function isSafeDeepLinkPath(path: unknown): path is string {
  if (typeof path !== "string" || path.length === 0 || path.length > MAX_DEEP_LINK_LENGTH) return false;
  let escapes = 0;
  for (let i = 0; i < path.length; i++) if (path.charCodeAt(i) === 37 && ++escapes > MAX_PERCENT_ESCAPES) return false;
  if (/%(?![0-9a-fA-F]{2})/.test(path)) return false; // malformed escapes are rejected, never decoded
  try {
    decodeURIComponent(path); // well-formed escapes that are not valid UTF-8 (e.g. "%C0") make React Navigation's own path-param decoding throw URIError
  } catch {
    return false;
  }
  return true;
}

/** Wraps a parser so unsafe paths yield `undefined` (React Navigation then ignores the link). */
export function guardGetStateFromPath<A extends unknown[], R>(parse: (path: string, ...rest: A) => R) {
  return (path: string, ...rest: A): R | undefined => {
    if (!isSafeDeepLinkPath(path)) return undefined;
    try {
      return parse(path, ...rest);
    } catch (error) {
      if (error instanceof URIError) return undefined; // a link that cannot be decoded is ignored, never allowed to interrupt navigation
      throw error;
    }
  };
}
