type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  multiGet?: (keys: string[]) => Promise<[string, string | null][]>;
  multiSet?: (pairs: [string, string][]) => Promise<void>;
};

let storageInstance: StorageLike | null | undefined;
let writeChain: Promise<void> = Promise.resolve();

const getStorageInstance = (): StorageLike | null => {
  if (storageInstance !== undefined) {
    return storageInstance;
  }
  try {
    const asyncStorageModule = require('@react-native-async-storage/async-storage');
    const storage = asyncStorageModule?.default ?? asyncStorageModule;
    if (storage?.getItem && storage?.setItem) {
      storageInstance = storage as StorageLike;
      return storageInstance;
    }
  } catch {
    // Native module unavailable in tests.
  }
  storageInstance = null;
  return null;
};

const isTooManyOpenFilesError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Too many open files') || message.includes('Code=24');
};

export const getAsyncStorageItem = async (key: string): Promise<string | null> => {
  const storage = getStorageInstance();
  if (!storage) {
    return null;
  }
  try {
    return await storage.getItem(key);
  } catch (error) {
    if (isTooManyOpenFilesError(error)) {
      return null;
    }
    throw error;
  }
};

export const setAsyncStorageItem = (key: string, value: string): Promise<void> => {
  const storage = getStorageInstance();
  if (!storage) {
    return Promise.resolve();
  }

  writeChain = writeChain
    .then(async () => {
      try {
        await storage.setItem(key, value);
      } catch (error) {
        if (!isTooManyOpenFilesError(error)) {
          throw error;
        }
      }
    })
    .catch(() => undefined);

  return writeChain;
};

export const removeAsyncStorageItem = (key: string): Promise<void> => {
  const storage = getStorageInstance();
  if (!storage) {
    return Promise.resolve();
  }

  writeChain = writeChain
    .then(async () => {
      try {
        await storage.removeItem(key);
      } catch (error) {
        if (!isTooManyOpenFilesError(error)) {
          throw error;
        }
      }
    })
    .catch(() => undefined);

  return writeChain;
};

export const setAsyncStorageItems = (pairs: [string, string][]): Promise<void> => {
  const storage = getStorageInstance();
  if (!storage || pairs.length === 0) {
    return Promise.resolve();
  }

  writeChain = writeChain
    .then(async () => {
      try {
        if (storage.multiSet) {
          await storage.multiSet(pairs);
          return;
        }
        for (const [key, value] of pairs) {
          await storage.setItem(key, value);
        }
      } catch (error) {
        if (!isTooManyOpenFilesError(error)) {
          throw error;
        }
      }
    })
    .catch(() => undefined);

  return writeChain;
};

export const getAsyncStorageItems = async (keys: string[]): Promise<Record<string, string | null>> => {
  const storage = getStorageInstance();
  if (!storage || keys.length === 0) {
    return {};
  }

  try {
    if (storage.multiGet) {
      const entries = await storage.multiGet(keys);
      return Object.fromEntries(entries);
    }
    const entries = await Promise.all(keys.map(async key => [key, await storage.getItem(key)] as const));
    return Object.fromEntries(entries);
  } catch (error) {
    if (isTooManyOpenFilesError(error)) {
      return {};
    }
    throw error;
  }
};
