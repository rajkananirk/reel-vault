export type ParsedAppDeepLink =
  | { type: 'open' }
  | { type: 'download'; mediaUrl: string };

const normalizeDeepLink = (rawUrl: string) => rawUrl.trim();

export const parseAppDeepLink = (rawUrl: string): ParsedAppDeepLink | null => {
  const url = normalizeDeepLink(rawUrl);
  if (!url.toLowerCase().startsWith('reelvault://')) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const host = (parsed.hostname || parsed.host || '').toLowerCase();
    const path = parsed.pathname.replace(/^\//, '').toLowerCase();

    if (host === 'download' || path === 'download') {
      const mediaUrl = parsed.searchParams.get('url')?.trim();
      if (mediaUrl) {
        return { type: 'download', mediaUrl: decodeURIComponent(mediaUrl) };
      }
    }

    return { type: 'open' };
  } catch {
    return { type: 'open' };
  }
};

export const buildAppOpenDeepLink = () => 'reelvault://open';

export const buildAppDownloadDeepLink = (mediaUrl: string) =>
  `reelvault://download?url=${encodeURIComponent(mediaUrl)}`;
