const SUPPORTED_DOMAINS = [
  'instagram.com',
  'facebook.com',
  'm.facebook.com',
  'mbasic.facebook.com',
  'fb.com',
  'fb.watch',
  'youtube.com',
  'm.youtube.com',
  'youtu.be',
] as const;

const HTTP_URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

/** instagram.com/reel/... style links copied without https */
const BARE_VIDEO_URL_REGEX =
  /(?:^|[\s(,])(?:https?:\/\/)?((?:www\.)?(?:instagram\.com|facebook\.com|m\.facebook\.com|fb\.com|fb\.watch|youtube\.com|youtu\.be)\/[^\s<>"']+)/gi;

export const sanitizeUrlCandidate = (value: string) => value.trim().replace(/[)\]},.!?]+$/g, '');

export const isSupportedVideoHost = (hostname: string) => {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return SUPPORTED_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`));
};

export const isSupportedSourceUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return isSupportedVideoHost(parsed.hostname);
  } catch {
    return false;
  }
};

const normalizeToHttps = (rawUrl: string) => {
  const trimmed = sanitizeUrlCandidate(rawUrl);
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const trySupportedCandidate = (rawUrl: string): string | null => {
  const normalized = normalizeToHttps(rawUrl);
  if (!normalized || !isSupportedSourceUrl(normalized)) {
    return null;
  }
  return normalized;
};

/**
 * Returns a supported IG/FB/YouTube URL embedded in text, or null for plain words/other sites.
 */
export const extractSupportedVideoUrl = (rawText: string): string | null => {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return null;
  }

  const httpMatches = trimmed.match(HTTP_URL_REGEX) ?? [];
  for (const match of httpMatches) {
    const found = trySupportedCandidate(match);
    if (found) {
      return found;
    }
  }

  const bareMatches = trimmed.matchAll(BARE_VIDEO_URL_REGEX);
  for (const match of bareMatches) {
    const found = trySupportedCandidate(match[1] ?? '');
    if (found) {
      return found;
    }
  }

  // Single-line paste with only a link (no spaces)
  if (!/\s/.test(trimmed)) {
    return trySupportedCandidate(trimmed);
  }

  return null;
};

export const clipboardHasSupportedVideoUrl = (rawText: string) => extractSupportedVideoUrl(rawText) !== null;
