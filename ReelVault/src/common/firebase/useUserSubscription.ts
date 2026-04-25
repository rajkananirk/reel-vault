import { useCallback, useEffect, useState } from 'react';

export type PremiumPlan = 'monthly' | 'yearly';

type SubscriptionState = {
  loading: boolean;
  submitting: boolean;
  isPro: boolean;
  plan: PremiumPlan | null;
  error: string | null;
  activatePlan: (uid: string, plan: PremiumPlan) => Promise<void>;
  cancelPlan: (uid: string) => Promise<void>;
};

const getPlanEntitlements = (plan: PremiumPlan) => ({
  cloudHistorySync: true,
  crossDeviceSync: true,
  extraStorageGb: plan === 'yearly' ? 250 : 100,
  quality: plan === 'yearly' ? '4k' : '1080p',
});

type FirestoreModule = {
  (): {
    collection: (name: string) => {
      doc: (id: string) => {
        onSnapshot: (
          onNext: (snapshot: { data: () => Record<string, unknown> | undefined }) => void,
          onError: (err: Error) => void,
        ) => () => void;
        set: (data: Record<string, unknown>, options: { merge: boolean }) => Promise<void>;
      };
    };
  };
  FieldValue: {
    serverTimestamp: () => unknown;
  };
};

const getFirestoreModule = (): FirestoreModule | null => {
  try {
    const module = require('@react-native-firebase/firestore');
    return (module?.default ?? module) as FirestoreModule;
  } catch {
    return null;
  }
};

export const useUserSubscription = (uid?: string): SubscriptionState => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [plan, setPlan] = useState<PremiumPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setIsPro(false);
      setPlan(null);
      setLoading(false);
      return;
    }

    const firestoreModule = getFirestoreModule();
    if (!firestoreModule) {
      setError('Firestore native module is not linked. Run pod install and rebuild iOS app.');
      setLoading(false);
      return;
    }

    const unsubscribe = firestoreModule()
      .collection('users')
      .doc(uid)
      .onSnapshot(
        snapshot => {
          const data = snapshot.data();
          const subscription = data?.subscription as { isPro?: boolean; plan?: PremiumPlan } | undefined;
          setIsPro(Boolean(subscription?.isPro));
          setPlan(subscription?.plan ?? null);
          setLoading(false);
        },
        err => {
          setError(err.message);
          setLoading(false);
        },
      );

    return unsubscribe;
  }, [uid]);

  const activatePlan = useCallback(async (userId: string, selectedPlan: PremiumPlan) => {
    if (!userId) {
      setError('Please login first.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const firestoreModule = getFirestoreModule();
      if (!firestoreModule) {
        throw new Error('Firestore native module is not linked. Run pod install and rebuild iOS app.');
      }

      await firestoreModule()
        .collection('users')
        .doc(userId)
        .set(
          {
            subscription: {
              isPro: true,
              plan: selectedPlan,
              entitlements: getPlanEntitlements(selectedPlan),
              updatedAt: firestoreModule.FieldValue.serverTimestamp(),
            },
          },
          { merge: true },
        );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const cancelPlan = useCallback(async (userId: string) => {
    if (!userId) {
      setError('Please login first.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const firestoreModule = getFirestoreModule();
      if (!firestoreModule) {
        throw new Error('Firestore native module is not linked. Run pod install and rebuild iOS app.');
      }

      await firestoreModule()
        .collection('users')
        .doc(userId)
        .set(
          {
            subscription: {
              isPro: false,
              plan: null,
              updatedAt: firestoreModule.FieldValue.serverTimestamp(),
            },
          },
          { merge: true },
        );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    loading,
    submitting,
    isPro,
    plan,
    error,
    activatePlan,
    cancelPlan,
  };
};
