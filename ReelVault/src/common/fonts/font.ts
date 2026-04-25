import { Platform } from 'react-native';

export const fontFamily = {
  regular: Platform.select({
    ios: 'AvenirNext-Regular',
    android: 'sans-serif',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'AvenirNext-Medium',
    android: 'sans-serif-medium',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'AvenirNext-DemiBold',
    android: 'sans-serif-bold',
    default: 'System',
  }),
  heavy: Platform.select({
    ios: 'AvenirNext-Bold',
    android: 'sans-serif-black',
    default: 'System',
  }),
} as const;
