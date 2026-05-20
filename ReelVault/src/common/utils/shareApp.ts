import { Share } from 'react-native';
import { getAppSharePayload } from '../constants/appShare';

export const shareAppPromo = async () => {
  const payload = getAppSharePayload();
  await Share.share(payload);
};
