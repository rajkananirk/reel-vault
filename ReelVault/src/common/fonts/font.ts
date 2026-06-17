import { Platform } from 'react-native';

// Inter is bundled in src/assets/fonts (see react-native.config.js).
// Android must use the linked file names; iOS keeps Avenir where available.
// Do not combine fontWeight with these fontFamily values on Android.
export const fontFamily = {
  regular: Platform.select({
    ios: 'AvenirNext-Regular',
    android: 'Inter-Regular',
    default: 'Inter-Regular',
  }),
  medium: Platform.select({
    ios: 'AvenirNext-Medium',
    android: 'Inter-Medium',
    default: 'Inter-Medium',
  }),
  bold: Platform.select({
    ios: 'AvenirNext-DemiBold',
    android: 'Inter-SemiBold',
    default: 'Inter-SemiBold',
  }),
  heavy: Platform.select({
    ios: 'AvenirNext-Bold',
    android: 'Inter-Bold',
    default: 'Inter-Bold',
  }),
} as const;
