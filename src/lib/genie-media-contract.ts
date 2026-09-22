export type GenieMediaMode = "audio" | "image" | "document";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".rtf": "application/rtf",
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".xml": "text/xml",
  ".md": "text/markdown",
};

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/avif",
]);

const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
]);

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/json",
  "application/rtf",
  "text/plain",
  "text/csv",
  "text/html",
  "text/css",
  "text/xml",
  "text/rtf",
  "text/markdown",
]);

function allowlist(mode: GenieMediaMode): Set<string> {
  if (mode === "image") return IMAGE_MIME_TYPES;
  if (mode === "audio") return AUDIO_MIME_TYPES;
  return DOCUMENT_MIME_TYPES;
}

function mimeFromFileName(fileName?: string | null): string | undefined {
  if (!fileName) return undefined;
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return undefined;
  return MIME_BY_EXTENSION[fileName.slice(dot).toLowerCase()];
}

export function resolveGenieMediaMimeType(
  mode: GenieMediaMode,
  declaredMimeType?: string | null,
  fileName?: string | null,
): string {
  const declared = declaredMimeType?.trim().toLowerCase();
  const allowed = allowlist(mode);

  if (declared) {
    if (!allowed.has(declared)) {
      throw new Error(`Unsupported ${mode} file type.`);
    }
    return declared;
  }

  const inferred = mimeFromFileName(fileName);
  if (!inferred || !allowed.has(inferred)) {
    throw new Error(`Could not determine a supported ${mode} file type.`);
  }
  return inferred;
}

export function assertKnownBoundedFileSize(
  size: unknown,
  maxBytes: number,
  label: string,
): asserts size is number {
  if (
    typeof size !== "number" ||
    !Number.isFinite(size) ||
    size <= 0
  ) {
    throw new Error(`${label} size could not be verified. Choose the file again.`);
  }
  if (size > maxBytes) {
    throw new Error(`${label} is too large. Choose a file under 10 MB.`);
  }
}
