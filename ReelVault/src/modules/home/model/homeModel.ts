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
  { id: 'instagram', label: 'Instagram', icon: 'logo-instagram', tint: '#E1306C' },
  { id: 'facebook', label: 'Facebook', icon: 'logo-facebook', tint: '#1877F2' },
  { id: 'youtube', label: 'YouTube', icon: 'logo-youtube', tint: '#FF0000' },
];

export const recents: RecentItem[] = [
];
