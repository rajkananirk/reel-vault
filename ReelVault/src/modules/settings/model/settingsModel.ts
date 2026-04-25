export type SettingsOption = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  type: 'link' | 'toggle' | 'theme' | 'accent' | 'value';
  value?: string;
};

export const accountOptions: SettingsOption[] = [
  {
    id: 'profile',
    title: 'Profile',
    subtitle: 'Manage your personal info',
    icon: 'person',
    type: 'link',
  },
  {
    id: 'subscription',
    title: 'Subscription',
    subtitle: 'StreamSave Premium',
    icon: 'star',
    type: 'link',
  },
];

export const downloadOptions: SettingsOption[] = [
  {
    id: 'storage',
    title: 'Storage Location',
    subtitle: 'Internal Storage / Downloads',
    icon: 'folder',
    type: 'value',
  },
  {
    id: 'auto',
    title: 'Auto-download',
    subtitle: 'Download links in clipboard',
    icon: 'sync',
    type: 'toggle',
  },
  {
    id: 'quality',
    title: 'Quality Selection',
    subtitle: 'Always ask',
    icon: 'options',
    type: 'link',
  },
];

export const appearanceOptions: SettingsOption[] = [
  {
    id: 'theme',
    title: 'Theme',
    subtitle: 'Light',
    icon: 'moon',
    type: 'theme',
  },
  {
    id: 'accent',
    title: 'Accent Color',
    subtitle: '',
    icon: 'color-palette',
    type: 'accent',
  },
];

export const aboutOptions: SettingsOption[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    subtitle: '',
    icon: 'shield-checkmark',
    type: 'link',
  },
  {
    id: 'version',
    title: 'Version',
    subtitle: '1.0.2 Stable Build',
    icon: 'information-circle',
    type: 'value',
  },
];
