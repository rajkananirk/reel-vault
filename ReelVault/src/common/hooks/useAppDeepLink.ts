import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { parseAppDeepLink } from '../utils/appDeepLink';

export type PendingDeepLink = {
  mediaUrl?: string;
};

export const useAppDeepLink = (enabled: boolean) => {
  const [pendingDeepLink, setPendingDeepLink] = useState<PendingDeepLink | null>(null);
  const handledInitialRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleIncomingUrl = (rawUrl?: string | null) => {
      if (!rawUrl) {
        return;
      }

      const parsed = parseAppDeepLink(rawUrl);
      if (!parsed) {
        return;
      }

      if (parsed.type === 'download') {
        setPendingDeepLink({ mediaUrl: parsed.mediaUrl });
        return;
      }

      setPendingDeepLink({});
    };

    Linking.getInitialURL()
      .then(url => {
        if (!handledInitialRef.current) {
          handledInitialRef.current = true;
          handleIncomingUrl(url);
        }
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', event => {
      handleIncomingUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [enabled]);

  const clearPendingDeepLink = () => {
    setPendingDeepLink(null);
  };

  return {
    pendingDeepLink,
    clearPendingDeepLink,
  };
};
