import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const widthScale = screenWidth / BASE_WIDTH;
const heightScale = screenHeight / BASE_HEIGHT;

export const scale = (size: number) => PixelRatio.roundToNearestPixel(size * widthScale);
export const verticalScale = (size: number) =>
  PixelRatio.roundToNearestPixel(size * heightScale);
export const moderateScale = (size: number, factor = 0.5) =>
  PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor);
