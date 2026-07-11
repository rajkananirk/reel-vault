export const API_BASE_URL = 'https://reelvault.leadvoxio.com';

export const APP_NAME = 'ReelVault';
export const APP_TAGLINE = 'FAST. SIMPLE. EVERYWHERE.';
export const APP_TABS = ['Home', 'Downloads', 'Settings'] as const;

export type AppTab = (typeof APP_TABS)[number];
