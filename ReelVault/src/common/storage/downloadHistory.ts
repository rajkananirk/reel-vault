export type SavedDownloadRecord = {
  id: string;
  title: string;
  sourceUrl: string;
  videoUrl: string;
  thumbnailUrl?: string;
  quality: string;
  platformName: string;
  savedAt: string;
};

export const SAVED_DOWNLOADS_STORAGE_KEY = 'reelvault.saved_extractions';

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

type FirestoreLite = {
  (): {
    collection: (name: string) => {
      doc: (id: string) => {
        collection: (name: string) => {
          doc: (id: string) => {
            set: (data: Record<string, unknown>, options: { merge: boolean }) => Promise<void>;
          };
        };
      };
    };
  };
  FieldValue: {
    serverTimestamp: () => unknown;
  };
};

const getStorage = (): StorageLike | null => {
  try {
    const asyncStorageModule = require('@react-native-async-storage/async-storage');
    const storage = asyncStorageModule?.default ?? asyncStorageModule;
    if (storage?.getItem && storage?.setItem) {
      return storage as StorageLike;
    }
    return null;
  } catch {
    return null;
  }
};

const getFirestore = (): FirestoreLite | null => {
  try {
    const module = require('@react-native-firebase/firestore');
    return (module?.default ?? module) as FirestoreLite;
  } catch {
    return null;
  }
};

export const loadSavedDownloads = async (): Promise<SavedDownloadRecord[]> => {
  const storage = getStorage();
  const raw = await storage?.getItem(SAVED_DOWNLOADS_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as SavedDownloadRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
};

export const appendSavedDownload = async (record: SavedDownloadRecord): Promise<SavedDownloadRecord[]> => {
  const storage = getStorage();
  if (!storage) {
    return [record];
  }
  const existing = await loadSavedDownloads();
  const deduped = existing.filter(item => item.videoUrl !== record.videoUrl);
  const next = [record, ...deduped].slice(0, 150);
  await storage.setItem(SAVED_DOWNLOADS_STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const removeSavedDownload = async (id: string): Promise<SavedDownloadRecord[]> => {
  const storage = getStorage();
  const existing = await loadSavedDownloads();
  const next = existing.filter(item => item.id !== id);
  if (storage) {
    await storage.setItem(SAVED_DOWNLOADS_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
};

export const syncSavedDownloadToCloud = async (uid: string, record: SavedDownloadRecord): Promise<void> => {
  const firestore = getFirestore();
  if (!firestore) {
    return;
  }
  try {
    await firestore()
      .collection('users')
      .doc(uid)
      .collection('downloadsHistory')
      .doc(record.id)
      .set(
        {
          ...record,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    // Do not block local save on cloud permission/rules issues.
    if (message.includes('permission-denied') || message.includes('missing or insufficient permissions')) {
      return;
    }
    throw error;
  }
};
