import { APP_NAME } from '../../../common/constants/app';

export type TrustPoint = {
  id: string;
  icon: 'shield-checkmark' | 'lock-closed' | 'checkmark-circle';
  text: string;
};

export type SplashModel = {
  title: string;
  trustBadge: string;
  headline: string;
  subtitle: string;
  ctaLabel: string;
  footerNote: string;
  ratingLabel: string;
  ratingSub: string;
  trustPoints: TrustPoint[];
  platforms: Array<{ id: string; label: string; tint: string }>;
};

export const splashModel: SplashModel = {
  title: APP_NAME,
  trustBadge: 'Private • Secure • On your device',
  headline: 'Save reels you love,\nkept safe on your phone',
  subtitle: 'A trusted downloader built for Instagram, Facebook, and YouTube — simple, fast, and under your control.',
  ctaLabel: "Let's unlock your reels",
  footerNote: 'Tap once to continue — we only ask on your first visit',
  ratingLabel: '4.9',
  ratingSub: 'Trusted by reel savers',
  trustPoints: [
    {
      id: 'private',
      icon: 'shield-checkmark',
      text: 'Videos save to your gallery — not our servers',
    },
    {
      id: 'secure',
      icon: 'lock-closed',
      text: 'No shady logins or hidden uploads',
    },
    {
      id: 'platforms',
      icon: 'checkmark-circle',
      text: 'One app for Instagram, Facebook & YouTube',
    },
  ],
  platforms: [
    { id: 'instagram', label: 'Instagram', tint: '#E1306C' },
    { id: 'facebook', label: 'Facebook', tint: '#1877F2' },
    { id: 'youtube', label: 'YouTube', tint: '#FF0000' },
  ],
};

/** Returning splash: progress bar fill duration (ms). */
export const RETURNING_PROGRESS_MS = 1500;
