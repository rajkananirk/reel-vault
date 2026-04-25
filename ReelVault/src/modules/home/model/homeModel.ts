export type PlatformItem = {
  id: string;
  label: string;
  icon: string;
  tint: string;
};

export type RecentItem = {
  id: string;
  title: string;
  source: string;
  size: string;
  thumbnail?: string;
  videoUrl?: string;
  sourceUrl?: string;
};

export const platforms: PlatformItem[] = [
  { id: 'instagram', label: 'Instagram', icon: 'logo-instagram', tint: '#FF7B55' },
  { id: 'facebook', label: 'Facebook', icon: 'logo-facebook', tint: '#4A8BFF' },
  { id: 'youtube', label: 'YouTube', icon: 'logo-youtube', tint: 'red' },
];

export const recents: RecentItem[] = [
];
