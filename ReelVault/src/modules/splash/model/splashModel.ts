import { APP_NAME, APP_TAGLINE } from '../../../common/constants/app';

export type SplashModel = {
  title: string;
  subtitle: string;
  progress: number;
};

export const splashModel: SplashModel = {
  title: APP_NAME,
  subtitle: APP_TAGLINE,
  progress: 0.74,
};
