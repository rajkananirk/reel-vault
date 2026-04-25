import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFirebaseAuth } from '../../../common/firebase/useFirebaseAuth';
import { useUserSubscription } from '../../../common/firebase/useUserSubscription';
import { fontFamily } from '../../../common/fonts/font';
import { colors } from '../../../common/theme/colors';
import { moderateScale, scale, verticalScale } from '../../../common/utils/responsive';
import { AppHeader } from '../../../common/widgets/AppHeader';
import { GlassCard } from '../../../common/widgets/GlassCard';
import { useSettingsViewModel } from '../viewmodel/useSettingsViewModel';

type SettingsScreenProps = {
  onGoBack?: () => void;
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
  onOpenSubscription?: () => void;
  onOpenProfileEdit?: () => void;
};

type ConfirmAction = 'logout' | 'delete' | null;
type ConfirmActionKey = Exclude<ConfirmAction, null>;
type ConfirmModalModel = {
  title: string;
  description: string;
  buttonText: string;
};

const CONFIRM_MODAL_MODEL: Record<ConfirmActionKey, ConfirmModalModel> = {
  logout: {
    title: 'Logout?',
    description: 'You will be logged out of your ReelVault account on this device.',
    buttonText: 'Logout',
  },
  delete: {
    title: 'Delete Account?',
    description:
      'This will permanently remove your account access on this device. You may need to sign up again to continue.',
    buttonText: 'Delete Account',
  },
};

type StorageLocationValue = 'internal' | 'app' | 'ask';
type StorageLocationOption = {
  value: StorageLocationValue;
  title: string;
  subtitle: string;
};
type QualitySelectionValue = 'ask' | 'best' | 'high' | 'dataSaver';
type QualitySelectionOption = {
  value: QualitySelectionValue;
  title: string;
  subtitle: string;
};

const STORAGE_LOCATION_OPTIONS: StorageLocationOption[] = [
  {
    value: 'internal',
    title: 'Internal Storage',
    subtitle: 'Downloads folder',
  },
  {
    value: 'app',
    title: 'App Private Storage',
    subtitle: 'Safer but less shareable',
  },
  {
    value: 'ask',
    title: 'Ask Every Time',
    subtitle: 'Choose per download',
  },
];
const QUALITY_SELECTION_OPTIONS: QualitySelectionOption[] = [
  {
    value: 'ask',
    title: 'Always Ask',
    subtitle: 'Choose quality every download',
  },
  {
    value: 'best',
    title: 'Best Available',
    subtitle: 'Auto highest quality',
  },
  {
    value: 'high',
    title: 'High (1080p)',
    subtitle: 'Balanced quality and size',
  },
  {
    value: 'dataSaver',
    title: 'Data Saver (720p)',
    subtitle: 'Smaller files, faster downloads',
  },
];

const STORAGE_LOCATION_STORAGE_KEY = 'reelvault.settings.storage_location';
const AUTO_DOWNLOAD_STORAGE_KEY = 'reelvault.settings.auto_download';
const QUALITY_SELECTION_STORAGE_KEY = 'reelvault.settings.quality_selection';

type FirestoreLite = {
  (): {
    collection: (name: string) => {
      doc: (id: string) => {
        onSnapshot: (
          onNext: (snapshot: { data: () => Record<string, unknown> | undefined }) => void,
          onError: (error: Error) => void,
        ) => () => void;
        set: (data: Record<string, unknown>, options: { merge: boolean }) => Promise<void>;
      };
    };
  };
  FieldValue: {
    serverTimestamp: () => unknown;
  };
};

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
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

const SectionTitle = ({ label }: { label: string }) => <Text style={styles.sectionTitle}>{label}</Text>;

const getUserDisplayName = (displayName?: string | null, email?: string | null) => {
  if (displayName?.trim()) {
    return displayName.trim();
  }
  return email?.split('@')[0] ?? 'User';
};

const getInitials = (value: string) => {
  const parts = value
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? 'U';
  const second = parts[1]?.[0] ?? '';
  return `${first}${second}`.toUpperCase();
};

type RowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  onPress?: () => void;
  isPro?: boolean;
};

const SettingRow = ({ icon, title, subtitle, right, onPress, isPro }: RowProps) => (
  <TouchableOpacity activeOpacity={onPress ? 0.85 : 1} onPress={onPress} disabled={!onPress} style={styles.row}>
    <View style={styles.rowIconWrap}>
      <Ionicons name={icon} size={moderateScale(19)} color={colors.primaryStrong} />
    </View>
    <View style={styles.rowMeta}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
    </View>
    {isPro ? (
      <View style={styles.proHeaderBadge}>
        <Ionicons name="sparkles" size={moderateScale(10)} color="#E9F6FF" />
        <Text style={styles.proHeaderBadgeText}>Pro</Text>
      </View>
    ) : null}
    {right}
  </TouchableOpacity>
);

export const SettingsScreen = ({ onGoBack, onOpenAuth, onOpenSubscription, onOpenProfileEdit }: SettingsScreenProps) => {
  const vm = useSettingsViewModel();
  const authVm = useFirebaseAuth();
  const subscriptionVm = useUserSubscription(authVm.user?.uid);
  const displayName = getUserDisplayName(authVm.user?.displayName, authVm.user?.email);
  const initials = getInitials(displayName);
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
  const [showStorageModal, setShowStorageModal] = React.useState(false);
  const [showQualityModal, setShowQualityModal] = React.useState(false);
  const [selectedStorageLocation, setSelectedStorageLocation] = React.useState<StorageLocationValue>('internal');
  const [autoDownloadEnabled, setAutoDownloadEnabled] = React.useState(true);
  const [selectedQuality, setSelectedQuality] = React.useState<QualitySelectionValue>('ask');
  const [storageReady, setStorageReady] = React.useState(false);
  const applyingRemoteSettingsRef = useRef(false);
  const lastSyncedSettingsRef = useRef<{
    storageLocation: StorageLocationValue;
    autoDownload: boolean;
    qualitySelection: QualitySelectionValue;
  } | null>(null);
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(16)).current;
  const cardAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.stagger(
        90,
        cardAnims.map(value =>
          Animated.timing(value, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start();
  }, [cardAnims, screenOpacity, screenTranslateY]);

  const onSubscriptionPress = () => {
    if (!authVm.user) {
      onOpenAuth?.('login');
      return;
    }
    onOpenSubscription?.();
  };

  const confirmModalData = confirmAction ? CONFIRM_MODAL_MODEL[confirmAction] : null;

  const onConfirmAction = async () => {
    if (!confirmAction) {
      return;
    }

    if (confirmAction === 'delete') {
      await authVm.deleteAccount();
      setConfirmAction(null);
      return;
    }

    if (confirmAction === 'logout') {
      await authVm.signOut();
      setConfirmAction(null);
    }
  };

  const planLabel = subscriptionVm.plan ? subscriptionVm.plan[0].toUpperCase() + subscriptionVm.plan.slice(1) : null;
  const selectedStorageLabel =
    STORAGE_LOCATION_OPTIONS.find(option => option.value === selectedStorageLocation)?.subtitle ?? 'Downloads folder';
  const selectedQualityLabel =
    QUALITY_SELECTION_OPTIONS.find(option => option.value === selectedQuality)?.title ?? 'Always Ask';

  useEffect(() => {
    let unsub: (() => void) | undefined;
    const storage = getStorage();
    const hydrateFromLocal = async () => {
      const localValue = await storage?.getItem(STORAGE_LOCATION_STORAGE_KEY);
      let nextStorage: StorageLocationValue = 'internal';
      if (localValue === 'internal' || localValue === 'app' || localValue === 'ask') {
        nextStorage = localValue;
      }
      const localAutoDownload = await storage?.getItem(AUTO_DOWNLOAD_STORAGE_KEY);
      let nextAutoDownload = true;
      if (localAutoDownload === 'true' || localAutoDownload === 'false') {
        nextAutoDownload = localAutoDownload === 'true';
      }
      const localQualitySelection = await storage?.getItem(QUALITY_SELECTION_STORAGE_KEY);
      let nextQualitySelection: QualitySelectionValue = 'ask';
      if (localQualitySelection === 'ask' || localQualitySelection === 'best' || localQualitySelection === 'high' || localQualitySelection === 'dataSaver') {
        nextQualitySelection = localQualitySelection;
      }
      setSelectedStorageLocation(nextStorage);
      setAutoDownloadEnabled(nextAutoDownload);
      setSelectedQuality(nextQualitySelection);
      lastSyncedSettingsRef.current = {
        storageLocation: nextStorage,
        autoDownload: nextAutoDownload,
        qualitySelection: nextQualitySelection,
      };
      setStorageReady(true);
    };

    if (!authVm.user?.uid) {
      hydrateFromLocal().catch(() => setStorageReady(true));
      return () => undefined;
    }

    const firestore = getFirestore();
    if (!firestore) {
      hydrateFromLocal().catch(() => setStorageReady(true));
      return () => undefined;
    }

    unsub = firestore()
      .collection('users')
      .doc(authVm.user.uid)
      .onSnapshot(
        async snapshot => {
          const data = snapshot.data();
          const settings = (data?.settings ?? {}) as { storageLocation?: unknown; autoDownload?: unknown; qualitySelection?: unknown };
          const cloudValue = settings.storageLocation;
          const cloudAutoDownload = settings.autoDownload;
          const cloudQualitySelection = settings.qualitySelection;
          let nextStorage: StorageLocationValue | null = null;
          let nextAutoDownload: boolean | null = null;
          let nextQualitySelection: QualitySelectionValue | null = null;

          if (cloudValue === 'internal' || cloudValue === 'app' || cloudValue === 'ask') {
            nextStorage = cloudValue;
            await storage?.setItem(STORAGE_LOCATION_STORAGE_KEY, cloudValue);
          }
          if (typeof cloudAutoDownload === 'boolean') {
            nextAutoDownload = cloudAutoDownload;
            await storage?.setItem(AUTO_DOWNLOAD_STORAGE_KEY, String(cloudAutoDownload));
          }
          if (
            cloudQualitySelection === 'ask' ||
            cloudQualitySelection === 'best' ||
            cloudQualitySelection === 'high' ||
            cloudQualitySelection === 'dataSaver'
          ) {
            nextQualitySelection = cloudQualitySelection;
            await storage?.setItem(QUALITY_SELECTION_STORAGE_KEY, cloudQualitySelection);
          }
          if (
            !(cloudValue === 'internal' || cloudValue === 'app' || cloudValue === 'ask') &&
            typeof cloudAutoDownload !== 'boolean' &&
            !(
              cloudQualitySelection === 'ask' ||
              cloudQualitySelection === 'best' ||
              cloudQualitySelection === 'high' ||
              cloudQualitySelection === 'dataSaver'
            )
          ) {
            await hydrateFromLocal();
            return;
          }

          applyingRemoteSettingsRef.current = true;
          if (nextStorage) {
            setSelectedStorageLocation(nextStorage);
          }
          if (typeof nextAutoDownload === 'boolean') {
            setAutoDownloadEnabled(nextAutoDownload);
          }
          if (nextQualitySelection) {
            setSelectedQuality(nextQualitySelection);
          }
          const previous = lastSyncedSettingsRef.current;
          lastSyncedSettingsRef.current = {
            storageLocation: nextStorage ?? previous?.storageLocation ?? 'internal',
            autoDownload: typeof nextAutoDownload === 'boolean' ? nextAutoDownload : previous?.autoDownload ?? true,
            qualitySelection: nextQualitySelection ?? previous?.qualitySelection ?? 'ask',
          };
          setStorageReady(true);
          setTimeout(() => {
            applyingRemoteSettingsRef.current = false;
          }, 0);
        },
        async () => {
          await hydrateFromLocal();
        },
      );

    return () => {
      if (unsub) {
        unsub();
      }
    };
  }, [authVm.user?.uid]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }
    if (applyingRemoteSettingsRef.current) {
      return;
    }

    const nextSettings = {
      storageLocation: selectedStorageLocation,
      autoDownload: autoDownloadEnabled,
      qualitySelection: selectedQuality,
    };
    const previous = lastSyncedSettingsRef.current;
    if (
      previous &&
      previous.storageLocation === nextSettings.storageLocation &&
      previous.autoDownload === nextSettings.autoDownload &&
      previous.qualitySelection === nextSettings.qualitySelection
    ) {
      return;
    }

    const storage = getStorage();
    storage?.setItem(STORAGE_LOCATION_STORAGE_KEY, nextSettings.storageLocation).catch(() => undefined);
    storage?.setItem(AUTO_DOWNLOAD_STORAGE_KEY, String(nextSettings.autoDownload)).catch(() => undefined);
    storage?.setItem(QUALITY_SELECTION_STORAGE_KEY, nextSettings.qualitySelection).catch(() => undefined);

    if (!authVm.user?.uid) {
      lastSyncedSettingsRef.current = nextSettings;
      return;
    }
    const firestore = getFirestore();
    if (!firestore) {
      lastSyncedSettingsRef.current = nextSettings;
      return;
    }
    lastSyncedSettingsRef.current = nextSettings;
    firestore()
      .collection('users')
      .doc(authVm.user.uid)
      .set(
        {
          settings: {
            storageLocation: nextSettings.storageLocation,
            autoDownload: nextSettings.autoDownload,
            qualitySelection: nextSettings.qualitySelection,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      )
      .catch(() => undefined);
  }, [selectedStorageLocation, autoDownloadEnabled, selectedQuality, authVm.user?.uid, storageReady]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />

      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={{ opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }}
      >
        <AppHeader
          title="Settings"
          showBack={Boolean(onGoBack)}
          onBack={onGoBack}
          right={
            <View style={styles.headerRight}>

              <TouchableOpacity
                activeOpacity={authVm.user ? 0.85 : 1}
                onPress={authVm.user ? onOpenProfileEdit : undefined}
                style={styles.avatar}
              >
                {authVm.user ? (
                  <>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                    {authVm.user.emailVerified ? (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark" size={moderateScale(9)} color="#F6FAFF" />
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Ionicons name="person" size={moderateScale(20)} color={colors.textStrong} />
                )}
              </TouchableOpacity>
            </View>
          }
        />

        <SectionTitle label="Account" />
        <Animated.View
          style={{
            opacity: cardAnims[0],
            transform: [{ translateY: cardAnims[0].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <GlassCard style={styles.groupCard}>
            {!authVm.loading && authVm.user ? (
              <>
                <SettingRow
                  icon="person"
                  title={authVm.user?.displayName || vm.accountOptions[0].title}
                  subtitle={authVm.user?.email || vm.accountOptions[0].subtitle}
                  isPro={subscriptionVm.isPro}
                  right={<Ionicons name="chevron-forward" size={moderateScale(17)} color={colors.textDim} />}
                  onPress={onOpenProfileEdit}
                />
                <View style={styles.rowDivider} />
                <SettingRow
                  icon="star"
                  title={vm.accountOptions[1].title}
                  subtitle={
                    subscriptionVm.isPro
                      ? `Pro User${planLabel ? ` • ${planLabel}` : ''} • History Sync Enabled`
                      : vm.accountOptions[1].subtitle
                  }
                  right={
                    <View style={styles.accountActions}>
                      <TouchableOpacity activeOpacity={0.85} onPress={onSubscriptionPress} style={styles.actionPill}>
                        <Text style={styles.myPlanText}>My Plan</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              </>
            ) : (
              <>
                <SettingRow
                  icon="star"
                  title={vm.accountOptions[1].title}
                  subtitle="Login required to view your plan"
                  right={
                    <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenAuth?.('login')} style={styles.actionPill}>
                      <Text style={styles.loginText}>Login</Text>
                    </TouchableOpacity>
                  }
                />
              </>
            )}
          </GlassCard>
        </Animated.View>

        <SectionTitle label="Downloads" />
        <Animated.View
          style={{
            opacity: cardAnims[1],
            transform: [{ translateY: cardAnims[1].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <GlassCard style={styles.groupCard}>
            <SettingRow
              icon="folder"
              title="Storage Location"
              subtitle={selectedStorageLabel}
              right={<Ionicons name="chevron-forward" size={moderateScale(17)} color={colors.textDim} />}
              onPress={() => setShowStorageModal(true)}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="sync"
              title="Auto-download"
              subtitle="Download links in clipboard"
              right={
                <Switch
                  value={autoDownloadEnabled}
                  onValueChange={setAutoDownloadEnabled}
                  trackColor={{ false: '#3a4861', true: colors.primaryStrong }}
                  thumbColor="#f5f9ff"
                  ios_backgroundColor="#3a4861"
                />
              }
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="options"
              title="Quality Selection"
              subtitle={selectedQualityLabel}
              right={<Ionicons name="chevron-forward" size={moderateScale(17)} color={colors.textDim} />}
              onPress={() => setShowQualityModal(true)}
            />
          </GlassCard>
        </Animated.View>


        <SectionTitle label="About" />
        <Animated.View
          style={{
            opacity: cardAnims[3],
            transform: [{ translateY: cardAnims[3].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <GlassCard style={styles.groupCard}>
            <SettingRow
              icon="shield-checkmark"
              title="Privacy Policy"
              subtitle=""
              right={<Ionicons name="open-outline" size={moderateScale(17)} color={colors.textDim} />}
            />
            <View style={styles.rowDivider} />
            <SettingRow icon="information-circle" title="Version" subtitle="1.0.2 Stable Build" />
          </GlassCard>
        </Animated.View>

        {!authVm.loading && authVm.user ? (
          <View style={styles.accountFooterLinks}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setConfirmAction('logout')}>
              <Text style={styles.footerLinkText}>Logout</Text>
            </TouchableOpacity>
            <Text style={styles.footerLinkDivider}>|</Text>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setConfirmAction('delete')}>
              <Text style={styles.footerDeleteText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {authVm.error ? <Text style={styles.footerErrorText}>{authVm.error}</Text> : null}
      </Animated.ScrollView>

      <Modal transparent visible={confirmAction !== null} animationType="fade" onRequestClose={() => setConfirmAction(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{confirmModalData?.title}</Text>
            <Text style={styles.modalDescription}>{confirmModalData?.description}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity activeOpacity={0.85} style={styles.modalCancelButton} onPress={() => setConfirmAction(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={styles.modalConfirmButton} onPress={onConfirmAction}>
                <Text style={styles.modalConfirmText}>
                  {authVm.submitting ? 'Please wait...' : confirmModalData?.buttonText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showStorageModal} animationType="fade" onRequestClose={() => setShowStorageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.storageModalCard}>
            <Text style={styles.modalTitle}>Storage Location</Text>
            <Text style={styles.modalDescription}>Choose where your downloads are saved by default.</Text>
            <Text style={styles.storageCloudHint}>
              {authVm.user ? 'Synced to your Firebase account' : 'Saved on this device'}
            </Text>

            <View style={styles.storageOptionsWrap}>
              {STORAGE_LOCATION_OPTIONS.map(option => {
                const isSelected = selectedStorageLocation === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedStorageLocation(option.value);
                      setShowStorageModal(false);
                    }}
                    style={[styles.storageOption, isSelected && styles.storageOptionActive]}
                  >
                    <View style={styles.storageOptionMeta}>
                      <Text style={styles.storageOptionTitle}>{option.title}</Text>
                      <Text style={styles.storageOptionSubtitle}>{option.subtitle}</Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={moderateScale(18)}
                      color={isSelected ? colors.primaryStrong : colors.textDim}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.storageActions}>
              <TouchableOpacity activeOpacity={0.85} style={styles.storageCloseButton} onPress={() => setShowStorageModal(false)}>
                <Text style={styles.storageCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showQualityModal} animationType="fade" onRequestClose={() => setShowQualityModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.storageModalCard}>
            <Text style={styles.modalTitle}>Quality Selection</Text>
            <Text style={styles.modalDescription}>Choose the default download quality behavior.</Text>
            <Text style={styles.storageCloudHint}>
              {authVm.user ? 'Synced to your Firebase account' : 'Saved on this device'}
            </Text>

            <View style={styles.storageOptionsWrap}>
              {QUALITY_SELECTION_OPTIONS.map(option => {
                const isSelected = selectedQuality === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedQuality(option.value);
                      setShowQualityModal(false);
                    }}
                    style={[styles.storageOption, isSelected && styles.storageOptionActive]}
                  >
                    <View style={styles.storageOptionMeta}>
                      <Text style={styles.storageOptionTitle}>{option.title}</Text>
                      <Text style={styles.storageOptionSubtitle}>{option.subtitle}</Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={moderateScale(18)}
                      color={isSelected ? colors.primaryStrong : colors.textDim}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.storageActions}>
              <TouchableOpacity activeOpacity={0.85} style={styles.storageCloseButton} onPress={() => setShowQualityModal(false)}>
                <Text style={styles.storageCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundBottom,
  },
  glow: {
    position: 'absolute',
    width: scale(320),
    height: scale(320),
    borderRadius: 999,
    backgroundColor: '#12315F',
    opacity: 0.12,
  },
  glowTop: {
    top: -scale(140),
    left: -scale(70),
  },
  glowBottom: {
    bottom: -scale(180),
    right: -scale(70),
  },
  content: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(55),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  authScreenWrap: {
    flex: 1,
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(65),
  },
  authScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(14),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(18),
  },
  backIcon: {
    width: scale(34),
  },
  headerTitle: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(24, 0.3),
  },
  avatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    position: 'relative',
    overflow: 'visible',
  },
  avatarInitials: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  verifiedBadge: {
    position: 'absolute',
    right: -scale(2),
    bottom: -scale(2),
    width: scale(16),
    height: scale(16),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#43C38A',
    borderWidth: 1,
    borderColor: '#EAF6FF',
  },
  proHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 999,
    backgroundColor: 'rgba(62, 141, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(155, 206, 255, 0.5)',
  },
  proHeaderBadgeText: {
    color: '#E9F6FF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(11, 0.2),
  },
  sectionTitle: {
    color: colors.textDim,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
    marginBottom: verticalScale(8),
    marginTop: verticalScale(3),
    letterSpacing: 0.7,
  },
  groupCard: {
    borderRadius: 16,
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    backgroundColor: 'rgba(24, 36, 58, 0.72)',
  },
  authBlock: {
    paddingVertical: verticalScale(8),
  },
  authVisual: {
    width: scale(58),
    height: scale(58),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: verticalScale(10),
    backgroundColor: 'rgba(56, 101, 169, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(139, 179, 238, 0.32)',
  },
  authTitle: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(18, 0.2),
    textAlign: 'center',
  },
  authSub: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    textAlign: 'center',
    marginTop: verticalScale(5),
    marginBottom: verticalScale(12),
    lineHeight: moderateScale(18, 0.2),
  },
  authInput: {
    backgroundColor: 'rgba(18, 30, 50, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(117, 154, 204, 0.2)',
    borderRadius: 12,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(11),
    color: colors.textStrong,
    fontFamily: fontFamily.medium,
    marginBottom: verticalScale(9),
  },
  authError: {
    color: '#FF8A8A',
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    marginBottom: verticalScale(8),
  },
  editHint: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    marginBottom: verticalScale(10),
    lineHeight: moderateScale(17, 0.2),
  },
  authActions: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: verticalScale(16),
  },
  authButton: {
    flex: 1,
    borderRadius: 12,
    minHeight: verticalScale(44),
    paddingVertical: verticalScale(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  authPrimary: {
    backgroundColor: colors.primaryStrong,
  },
  authSecondary: {
    backgroundColor: 'rgba(55, 72, 101, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(121, 161, 214, 0.25)',
  },
  authPrimaryText: {
    color: '#F6FAFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(14, 0.2),
  },
  authSecondaryText: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(11),
  },
  rowIconWrap: {
    width: scale(38),
    height: scale(38),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(44, 76, 120, 0.35)',
    marginRight: scale(10),
  },
  rowMeta: {
    flex: 1,
  },
  rowTitle: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(16, 0.2),
  },
  rowSub: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.2),
    marginTop: verticalScale(2),
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  themePill: {
    flexDirection: 'row',
    padding: scale(4),
    borderRadius: 999,
    backgroundColor: 'rgba(18, 28, 45, 0.95)',
    gap: scale(4),
  },
  themeChip: {
    paddingHorizontal: scale(11),
    paddingVertical: verticalScale(6),
    borderRadius: 999,
  },
  themeChipActive: {
    backgroundColor: colors.primaryStrong,
  },
  themeChipText: {
    color: colors.textDim,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  themeChipTextActive: {
    color: '#f4f8ff',
  },
  accentRow: {
    flexDirection: 'row',
    gap: scale(8),
    alignItems: 'center',
  },
  accentDot: {
    width: scale(22),
    height: scale(22),
    borderRadius: 99,
  },
  accentDotSelected: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  logoutText: {
    color: '#F6FAFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  loginText: {
    color: '#EAF6FF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(12, 0.2),
  },
  myPlanText: {
    color: '#EAF6FF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(12, 0.2),
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  actionPill: {
    minHeight: verticalScale(30),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(62, 141, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(155, 206, 255, 0.45)',
  },
  logoutButton: {
    marginTop: verticalScale(10),
    borderRadius: 12,
    minHeight: verticalScale(42),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(62, 141, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(155, 206, 255, 0.45)',
  },
  accountFooterLinks: {
    marginTop: verticalScale(8),
    marginBottom: verticalScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
  },
  footerLinkText: {
    color: colors.textMuted,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  footerDeleteText: {
    color: '#FF8A8A',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  footerLinkDivider: {
    color: colors.textDim,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.2),
  },
  footerErrorText: {
    textAlign: 'center',
    color: '#FF8A8A',
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    marginBottom: verticalScale(8),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 18, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(18),
  },
  modalCard: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    backgroundColor: 'rgba(16, 28, 48, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(123, 166, 232, 0.28)',
  },
  modalTitle: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(18, 0.2),
    marginBottom: verticalScale(6),
  },
  modalDescription: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.2),
    lineHeight: moderateScale(18, 0.2),
  },
  modalActions: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(16),
  },
  modalCancelButton: {
    flex: 1,
    minHeight: verticalScale(42),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(121, 161, 214, 0.28)',
    backgroundColor: 'rgba(55, 72, 101, 0.35)',
  },
  modalConfirmButton: {
    flex: 1,
    minHeight: verticalScale(42),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(62, 141, 255, 0.85)',
  },
  modalCancelText: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  modalConfirmText: {
    color: '#F6FAFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  storageOptionsWrap: {
    marginTop: verticalScale(10),
    marginBottom: verticalScale(12),
    gap: verticalScale(8),
  },
  storageModalCard: {
    width: '100%',
    maxWidth: scale(360),
    borderRadius: 20,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(14),
    backgroundColor: 'rgba(16, 28, 48, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(123, 166, 232, 0.28)',
  },
  storageCloudHint: {
    color: colors.primary,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(11, 0.2),
    marginTop: verticalScale(4),
  },
  storageOption: {
    borderRadius: 12,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderWidth: 1,
    borderColor: 'rgba(121, 161, 214, 0.22)',
    backgroundColor: 'rgba(55, 72, 101, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storageOptionActive: {
    borderColor: 'rgba(155, 206, 255, 0.5)',
    backgroundColor: 'rgba(62, 141, 255, 0.22)',
  },
  storageOptionMeta: {
    flex: 1,
    paddingRight: scale(8),
  },
  storageOptionTitle: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  storageOptionSubtitle: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    marginTop: verticalScale(2),
  },
  storageActions: {
    marginTop: verticalScale(2),
    alignItems: 'center',
  },
  storageCloseButton: {
    minHeight: verticalScale(42),
    borderRadius: 12,
    paddingHorizontal: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(121, 161, 214, 0.28)',
    backgroundColor: 'rgba(55, 72, 101, 0.35)',
    width: '100%',
  },
  storageCloseText: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: verticalScale(90),
    backgroundColor: 'rgba(4, 10, 23, 0.92)',
  },
});
