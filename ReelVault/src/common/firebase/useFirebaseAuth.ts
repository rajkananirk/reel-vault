import { useCallback, useEffect, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_PROFILE_STORAGE_KEY = 'reelvault.auth_profile';

type StoredAuthProfile = {
  uid: string;
  email: string | null;
  fullName: string | null;
};

type FirestoreLite = {
  (): {
    collection: (name: string) => {
      doc: (id: string) => {
        set: (data: Record<string, unknown>, options: { merge: boolean }) => Promise<void>;
      };
    };
  };
  FieldValue: {
    serverTimestamp: () => unknown;
  };
};

type StorageLike = {
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const createNoopStorage = (): StorageLike => ({
  setItem: async () => undefined,
  removeItem: async () => undefined,
});

const getStorage = (): StorageLike => {
  try {
    const asyncStorageModule = require('@react-native-async-storage/async-storage');
    const storage = asyncStorageModule?.default ?? asyncStorageModule;
    if (storage?.setItem && storage?.removeItem) {
      return storage as StorageLike;
    }
    return createNoopStorage();
  } catch {
    return createNoopStorage();
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

const validateCredentials = (email: string, password: string, fullName?: string) => {
  const normalizedEmail = email.trim();
  const normalizedName = fullName?.trim() ?? '';

  if (!normalizedEmail || !password) {
    return 'Email and password are required.';
  }

  if (typeof fullName === 'string' && !normalizedName) {
    return 'Full Name is required for signup.';
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return 'Please enter a valid email address.';
  }

  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }

  return null;
};

const validateProfile = (fullName: string, email: string) => {
  const normalizedName = fullName.trim();
  const normalizedEmail = email.trim();

  if (!normalizedName) {
    return 'Full Name is required.';
  }

  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    return 'Please enter a valid email address.';
  }

  return null;
};

const mapFirebaseError = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  const code =
    typeof err === 'object' && err !== null && 'code' in err && typeof (err as { code?: unknown }).code === 'string'
      ? ((err as { code: string }).code as string)
      : '';

  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered. Please login instead.';
  }

  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }

  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters.';
  }

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (code === 'auth/requires-recent-login') {
    return 'For security, please login again before deleting your account.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Network error. Check your internet connection and try again.';
  }

  if (code === 'auth/internal-error' || message.includes('[auth/internal-error]')) {
    return 'Firebase internal error. In Firebase Console, enable Email/Password sign-in method and try again.';
  }

  if (message.includes("No Firebase App '[DEFAULT]'")) {
    return 'Firebase iOS config is not linked to the app target. In Xcode, add GoogleService-Info.plist to the ReelVault target and rebuild.';
  }

  return message;
};

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const unsubscribe = auth().onAuthStateChanged(currentUser => {
        setUser(currentUser);
        setLoading(false);
        const storage = getStorage();
        if (currentUser) {
          const profile: StoredAuthProfile = {
            uid: currentUser.uid,
            email: currentUser.email,
            fullName: currentUser.displayName ?? null,
          };
          storage.setItem(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(profile)).catch(() => undefined);
        } else {
          storage.removeItem(AUTH_PROFILE_STORAGE_KEY).catch(() => undefined);
        }
      });

      return unsubscribe;
    } catch (err) {
      setError(mapFirebaseError(err));
      setLoading(false);
      return undefined;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signIn = useCallback(async (email: string, password: string) => {
    const validationError = validateCredentials(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const credential = await auth().signInWithEmailAndPassword(email.trim(), password);
      const firestore = getFirestore();
      if (firestore) {
        await firestore()
          .collection('users')
          .doc(credential.user.uid)
          .set(
            {
              email: credential.user.email ?? null,
              fullName: credential.user.displayName ?? null,
              lastLoginAt: firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }
    } catch (err) {
      setError(mapFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const validationError = validateCredentials(email, password, fullName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const credential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      await credential.user.updateProfile({ displayName: fullName.trim() });
      const storage = getStorage();
      const firestore = getFirestore();
      const profile: StoredAuthProfile = {
        uid: credential.user.uid,
        email: credential.user.email,
        fullName: fullName.trim(),
      };
      await storage.setItem(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(profile));
      if (firestore) {
        await firestore()
          .collection('users')
          .doc(credential.user.uid)
          .set(
            {
              email: credential.user.email ?? null,
              fullName: fullName.trim(),
              createdAt: firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }
    } catch (err) {
      setError(mapFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await auth().signOut();
    } catch (err) {
      setError(mapFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('Please login first.');
      }

      const storage = getStorage();
      await currentUser.delete();
      await storage.removeItem(AUTH_PROFILE_STORAGE_KEY);
    } catch (err) {
      setError(mapFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const updateUserProfile = useCallback(async (fullName: string, email: string) => {
    const validationError = validateProfile(fullName, email);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setSubmitting(true);
    setError(null);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('Please login first.');
      }

      const normalizedName = fullName.trim();
      const normalizedEmail = email.trim();

      if (currentUser.displayName !== normalizedName) {
        await currentUser.updateProfile({ displayName: normalizedName });
      }

      if (currentUser.email && currentUser.email !== normalizedEmail) {
        if (typeof currentUser.verifyBeforeUpdateEmail === 'function') {
          await currentUser.verifyBeforeUpdateEmail(normalizedEmail);
        } else {
          await currentUser.updateEmail(normalizedEmail);
        }
      }

      const firestore = getFirestore();
      if (firestore) {
        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .set(
            {
              email: normalizedEmail,
              fullName: normalizedName,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }

      const storage = getStorage();
      const profile: StoredAuthProfile = {
        uid: currentUser.uid,
        email: normalizedEmail,
        fullName: normalizedName,
      };
      await storage.setItem(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(profile));

      await currentUser.reload();
      setUser(auth().currentUser);
      return true;
    } catch (err) {
      setError(mapFirebaseError(err));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    user,
    loading,
    submitting,
    error,
    clearError,
    signIn,
    signUp,
    signOut,
    deleteAccount,
    updateUserProfile,
  };
};
