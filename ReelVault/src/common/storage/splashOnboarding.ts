import { getAsyncStorageItem, setAsyncStorageItem } from './asyncStorage';

export const SPLASH_ONBOARDING_KEY = 'reelvault.splash.onboarding_completed';

export const hasCompletedSplashOnboarding = async (): Promise<boolean> => {
  const value = await getAsyncStorageItem(SPLASH_ONBOARDING_KEY);
  return value === 'true';
};

export const markSplashOnboardingComplete = async (): Promise<void> => {
  await setAsyncStorageItem(SPLASH_ONBOARDING_KEY, 'true');
};
