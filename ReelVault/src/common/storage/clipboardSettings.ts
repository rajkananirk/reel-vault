import { getAsyncStorageItem, removeAsyncStorageItem, setAsyncStorageItem } from './asyncStorage';

export const AUTO_DOWNLOAD_STORAGE_KEY = 'reelvault.settings.auto_download';
export const CLIPBOARD_PASTE_DECLINED_KEY = 'reelvault.settings.clipboard_paste_declined';

export const getClipboardDetectEnabled = async (): Promise<boolean> => {
  const value = await getAsyncStorageItem(AUTO_DOWNLOAD_STORAGE_KEY);
  return value === 'true';
};

export const isClipboardPasteDeclined = async (): Promise<boolean> => {
  const value = await getAsyncStorageItem(CLIPBOARD_PASTE_DECLINED_KEY);
  return value === 'true';
};

export const setClipboardPasteDeclined = async (declined: boolean): Promise<void> => {
  if (declined) {
    await setAsyncStorageItem(CLIPBOARD_PASTE_DECLINED_KEY, 'true');
    return;
  }
  await removeAsyncStorageItem(CLIPBOARD_PASTE_DECLINED_KEY);
};

export const canReadClipboardForDetect = async (): Promise<boolean> => {
  const [enabled, declined] = await Promise.all([getClipboardDetectEnabled(), isClipboardPasteDeclined()]);
  return enabled && !declined;
};
