import { Platform } from 'react-native';

/** Custom URL scheme — opens ReelVault when the app is installed. */
export const APP_DEEP_LINK_OPEN = 'reelvault://open';

export const APP_SHARE_TITLE = 'ReelVault';

export const APP_SHARE_BODY =
  'I am using ReelVault to save videos from Instagram, Facebook, and YouTube with one tap. Try ReelVault for fast downloads and premium history sync.';

/** Update when App Store / Play Store listings are live. */
export const APP_STORE_URL = '';
export const PLAY_STORE_URL = '';

export const getAppShareMessage = () => {
  const lines = [APP_SHARE_BODY, '', `Open ReelVault: ${APP_DEEP_LINK_OPEN}`];

  if (Platform.OS === 'ios' && APP_STORE_URL) {
    lines.push(`Download on App Store: ${APP_STORE_URL}`);
  }
  if (Platform.OS === 'android' && PLAY_STORE_URL) {
    lines.push(`Download on Play Store: ${PLAY_STORE_URL}`);
  }

  return lines.join('\n');
};

export const getAppSharePayload = () => {
  const message = getAppShareMessage();

  if (Platform.OS === 'ios') {
    return {
      title: APP_SHARE_TITLE,
      message,
      url: APP_DEEP_LINK_OPEN,
    };
  }

  return {
    title: APP_SHARE_TITLE,
    message,
  };
};
