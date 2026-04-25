import React, { useEffect, useRef } from 'react';
import { Animated,
} from 'react-native';
import {
  ActivityIndicator,
  Easing,
  FlatList,
  ImageBackground,
  Linking,
  Modal,
  NativeModules,
  Platform,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@react-native-vector-icons/ionicons';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { AppTab } from '../../../common/constants/app';
import { useFirebaseAuth } from '../../../common/firebase/useFirebaseAuth';
import { useUserSubscription } from '../../../common/firebase/useUserSubscription';
import { fontFamily } from '../../../common/fonts/font';
import { colors } from '../../../common/theme/colors';
import { moderateScale, scale, verticalScale } from '../../../common/utils/responsive';
import { GlassCard } from '../../../common/widgets/GlassCard';
import { SectionHeader } from '../../../common/widgets/SectionHeader';
import { AppHeader } from '../../../common/widgets/AppHeader';
import { useHomeViewModel } from '../viewmodel/useHomeViewModel';

type HomeScreenProps = {
  onTabPress: (tab: AppTab) => void;
  onOpenExtractResult: (payload: {
    sourceUrl: string;
    title: string;
    videoUrl: string;
    platformName: string;
    thumbnailUrl?: string | null;
  }) => void;
};

type ExtractApiSuccess = {
  title?: string;
  video_url?: string;
  thumbnail_url?: string;
  url?: string;
};

type ExtractApiError = {
  detail?: string;
  message?: string;
};

const resolveApiBaseUrl = () => {
  const fallback = 'http://192.168.1.10:8000';
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
    if (!scriptURL) {
      return fallback;
    }
    const hostWithPort = scriptURL.split('://')[1]?.split('/')[0];
    const host = hostWithPort?.split(':')[0];
    if (!host) {
      return fallback;
    }
    return `http://${host}:8000`;
  } catch {
    return fallback;
  }
};

const EXTRACT_API_URL = `${resolveApiBaseUrl()}/extract`;
const EXTRACT_REQUEST_TIMEOUT_MS = 18000;
const LOADER_CHIP_STEP = scale(44);
const LOADER_PLATFORM_ICONS: Array<{ id: string; icon: React.ComponentProps<typeof Ionicons>['name']; tint: string }> = [
  { id: 'instagram', icon: 'logo-instagram', tint: '#FF7B55' },
  { id: 'facebook', icon: 'logo-facebook', tint: '#4A8BFF' },
  { id: 'youtube', icon: 'logo-youtube', tint: '#FF4D4D' },
];
const APP_PROMO_MESSAGE =
  'I am using ReelVault to save videos from Instagram, Facebook, and YouTube with one tap. Try ReelVault for fast downloads and premium history sync.';

const getUserDisplayName = (displayName?: string | null, email?: string | null) => {
  if (displayName?.trim()) {
    return displayName.trim();
  }
  return email?.split('@')[0] ?? 'User';
};

const getInitial = (value: string) => {
  const normalized = value.trim();
  return (normalized[0] ?? 'U').toUpperCase();
};

const getPlatformName = (url: string) => {
  const normalized = url.toLowerCase();
  if (normalized.includes('instagram.com')) return 'Instagram';
  if (normalized.includes('facebook.com')) return 'Facebook';
  if (normalized.includes('youtube.com')) return 'YouTube';
  if (normalized.includes('youtu.be')) return 'YouTube';
  return 'Unknown';
};

const SUPPORTED_HOSTS = ['instagram.com', 'facebook.com', 'youtube.com', 'youtu.be'];

const isSupportedSourceUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return SUPPORTED_HOSTS.some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};

const getClipboardText = async (): Promise<string> => {
  try {
    const clipboardModule = NativeModules?.Clipboard;
    if (!clipboardModule) {
      return '';
    }

    if (typeof clipboardModule.getString === 'function') {
      const value = clipboardModule.getString();
      if (typeof value === 'string') {
        return value;
      }
      if (value && typeof value.then === 'function') {
        const resolved = await value;
        return typeof resolved === 'string' ? resolved : '';
      }
      if (value && typeof value === 'object' && typeof value.value === 'string') {
        return value.value;
      }
    }

    if (typeof clipboardModule.getStringSync === 'function') {
      const value = clipboardModule.getStringSync();
      return typeof value === 'string' ? value : '';
    }

    return '';
  } catch {
    return '';
  }
};

const clearClipboardText = async (): Promise<void> => {
  try {
    const clipboardModule = NativeModules?.Clipboard;
    if (!clipboardModule) {
      return;
    }

    if (typeof clipboardModule.setString === 'function') {
      const result = clipboardModule.setString('');
      if (result && typeof result.then === 'function') {
        await result;
      }
      return;
    }

    if (typeof clipboardModule.setStringSync === 'function') {
      clipboardModule.setStringSync('');
    }
  } catch {
    // Ignore clipboard clear errors.
  }
};

export const HomeScreen = ({ onTabPress, onOpenExtractResult }: HomeScreenProps) => {
  const vm = useHomeViewModel();
  const authVm = useFirebaseAuth();
  const subscriptionVm = useUserSubscription(authVm.user?.uid);
  const displayName = getUserDisplayName(authVm.user?.displayName, authVm.user?.email);
  const userInitial = getInitial(displayName);
  const { width } = useWindowDimensions();
  const platformCardWidth = (width - scale(68)) / 3;
  const recentPreviewItems = vm.recents.slice(0, 4);
  const ioniconName = (name: string): React.ComponentProps<typeof Ionicons>['name'] =>
    name as React.ComponentProps<typeof Ionicons>['name'];
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(18)).current;
  const loaderHighlightX = useRef(new Animated.Value(0)).current;
  const loaderLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const [loaderIconOrder, setLoaderIconOrder] = React.useState(LOADER_PLATFORM_ICONS);
  const [detecting, setDetecting] = React.useState(false);
  const [detectError, setDetectError] = React.useState<string | null>(null);
  const [showDetectErrorModal, setShowDetectErrorModal] = React.useState(false);
  const [detectErrorModalMessage, setDetectErrorModalMessage] = React.useState<string>('');
  const [showQuickDetectModal, setShowQuickDetectModal] = React.useState(false);
  const [quickDetectUrl, setQuickDetectUrl] = React.useState('');
  const lastQuickPromptedUrlRef = useRef('');
  const lastClipboardValueRef = useRef('');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslateY]);

  useEffect(() => {
    if (!detecting) {
      loaderLoopRef.current?.stop();
      loaderLoopRef.current = null;
      loaderHighlightX.setValue(0);
      setLoaderIconOrder(LOADER_PLATFORM_ICONS);
      return undefined;
    }
    let cancelled = false;
    const runSwipe = () => {
      if (cancelled) {
        return;
      }
      loaderLoopRef.current = Animated.timing(loaderHighlightX, {
        toValue: -LOADER_CHIP_STEP,
        duration: 920,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      loaderLoopRef.current.start(({ finished }) => {
        if (!finished || cancelled) {
          return;
        }
        setLoaderIconOrder(prev => (prev.length > 1 ? [...prev.slice(1), prev[0]] : prev));
        loaderHighlightX.setValue(0);
        runSwipe();
      });
    };
    runSwipe();
    return () => {
      cancelled = true;
      loaderLoopRef.current?.stop();
      loaderLoopRef.current = null;
    };
  }, [detecting, loaderHighlightX]);

  useFocusEffect(
    React.useCallback(() => {
      vm.reloadHistory?.();
      return undefined;
    }, [vm]),
  );

  const triggerQuickDetectPrompt = React.useCallback(
    (candidateUrl: string) => {
      const trimmed = candidateUrl.trim();
      if (!trimmed || !isSupportedSourceUrl(trimmed)) {
        return;
      }
      vm.setUrl(trimmed);
      if (trimmed !== lastQuickPromptedUrlRef.current) {
        setQuickDetectUrl(trimmed);
        setShowQuickDetectModal(true);
        lastQuickPromptedUrlRef.current = trimmed;
      }
    },
    [vm],
  );

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const checkClipboard = async () => {
        try {
          const clipboardValue = (await getClipboardText())?.trim() ?? '';
          if (!isMounted || !clipboardValue || clipboardValue === lastClipboardValueRef.current) {
            return;
          }
          lastClipboardValueRef.current = clipboardValue;
          triggerQuickDetectPrompt(clipboardValue);
        } catch {
          // Ignore clipboard read failures and keep manual input flow.
        }
      };

      checkClipboard().catch(() => undefined);
      const interval = setInterval(() => {
        checkClipboard().catch(() => undefined);
      }, 1200);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }, [triggerQuickDetectPrompt]),
  );

  const onDetect = async () => {
    const sourceUrl = vm.url.trim();
    if (!sourceUrl) {
      const message = 'Please paste a URL first.';
      setDetectError(message);
      setDetectErrorModalMessage(message);
      setShowDetectErrorModal(true);
      return;
    }

    if (!isSupportedSourceUrl(sourceUrl)) {
      const message = 'Unsupported URL. Only Instagram, Facebook, and YouTube links are allowed.';
      setDetectError(message);
      setDetectErrorModalMessage(message);
      setShowDetectErrorModal(true);
      return;
    }

    setDetecting(true);
    setDetectError(null);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller.abort();
      }, EXTRACT_REQUEST_TIMEOUT_MS);
      const response = await fetch(EXTRACT_API_URL, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: sourceUrl }),
        signal: controller.signal,
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const rawBody = await response.text();
      let body: (ExtractApiSuccess & ExtractApiError) | null = null;
      try {
        body = rawBody ? (JSON.parse(rawBody) as ExtractApiSuccess & ExtractApiError) : null;
      } catch {
        body = null;
      }

      if (!response.ok) {
        throw new Error(body?.detail || body?.message || 'Unable to extract media from this URL.');
      }

      const videoUrl = body?.video_url || body?.url;
      const title = body?.title || 'Extracted Video';
      if (!videoUrl) {
        throw new Error('No direct media URL returned from API.');
      }

      onOpenExtractResult({
        sourceUrl,
        title,
        videoUrl,
        platformName: getPlatformName(sourceUrl),
        thumbnailUrl: body?.thumbnail_url ?? null,
      });
      await clearClipboardText();
      lastClipboardValueRef.current = '';
      lastQuickPromptedUrlRef.current = '';
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Detection timed out. Please try again.'
          : error instanceof Error
            ? error.message
            : 'Failed to call extract API.';
      setDetectError(message);
      setDetectErrorModalMessage(message);
      setShowDetectErrorModal(true);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setDetecting(false);
    }
  };

  const onShareRecent = async () => {
    await Share.share(
      Platform.OS === 'ios'
        ? { message: APP_PROMO_MESSAGE }
        : { message: APP_PROMO_MESSAGE },
    );
  };

  const onOpenRecentSource = async (sourceUrl?: string) => {
    if (!sourceUrl) {
      const message = 'Original source link is not available for this item.';
      setDetectError(message);
      setDetectErrorModalMessage(message);
      setShowDetectErrorModal(true);
      return;
    }
    try {
      await Linking.openURL(sourceUrl);
    } catch {
      const message = 'Unable to open source link.';
      setDetectError(message);
      setDetectErrorModalMessage(message);
      setShowDetectErrorModal(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}
      >
        <AppHeader
          title={vm.appName}
          right={
            <View style={styles.avatar}>
              {authVm.user ? (
                <Text style={styles.avatarInitial}>{userInitial}</Text>
              ) : (
                <Ionicons name="person" size={moderateScale(18)} color={colors.textStrong} />
              )}
              {subscriptionVm.isPro ? (
                <View style={styles.proBadge}>
                  <Ionicons name="sparkles" size={moderateScale(8)} color="#EAF6FF" />
                </View>
              ) : null}
            </View>
          }
        />

        <GlassCard style={styles.detectCard}>
          <View style={styles.detectInputWrap}>
            <Ionicons name="link-outline" size={moderateScale(18)} color={colors.textMuted} style={styles.linkIcon} />
            <TextInput
              value={vm.url}
              onChangeText={text => {
                vm.setUrl(text);
                if (detectError) {
                  setDetectError(null);
                }
                if (showDetectErrorModal) {
                  setShowDetectErrorModal(false);
                }
                triggerQuickDetectPrompt(text);
              }}
              placeholder="Paste link here..."
              placeholderTextColor={colors.textDim}
              style={styles.input}
            />
            {vm.url.trim().length > 0 ? (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.clearInputButton}
                onPress={() => {
                  vm.setUrl('');
                  setDetectError(null);
                  setShowDetectErrorModal(false);
                }}
              >
                <Ionicons name="close" size={moderateScale(16)} color={colors.textStrong} />
              </TouchableOpacity>
            ) : null}
          </View>
          {detectError ? <Text style={styles.detectErrorText}>{detectError}</Text> : null}
        </GlassCard>

        <TouchableOpacity style={[styles.downloadButton, detecting ? styles.downloadButtonDisabled : null]} activeOpacity={0.85} disabled={detecting} onPress={onDetect}>
          <MaterialDesignIcons name="download-outline" size={moderateScale(22)} color="#0A1C33" />
          <Text style={styles.downloadButtonText}>{detecting ? 'Detecting...' : 'Download'}</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <SectionHeader title="Supported Platforms" />
          <FlatList
            horizontal
            data={vm.platforms}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.platformList}
            renderItem={({ item }) => (
              <GlassCard style={[styles.platformCard, { width: platformCardWidth }]}>
                <View style={[styles.platformIconWrap, { backgroundColor: item.tint }]}>
                  <Ionicons name={ioniconName(item.icon)} size={moderateScale(20)} color="#fff" />
                </View>
                <Text style={styles.platformLabel}>{item.label}</Text>
              </GlassCard>
            )}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Recent Downloads" />
          {recentPreviewItems.length === 0 ? (
            <GlassCard style={styles.emptyRecentCard}>
              <View style={styles.emptyRecentIconWrap}>
                <Ionicons name="albums-outline" size={moderateScale(22)} color={colors.primaryStrong} />
              </View>
              <Text style={styles.emptyRecentTitle}>No Downloads Yet</Text>
              <Text style={styles.emptyRecentSub}>Save any extracted video and it will appear here instantly.</Text>
            </GlassCard>
          ) : null}
          {recentPreviewItems.map(item => (
            <GlassCard key={item.id} style={styles.recentCard}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenRecentSource(item.sourceUrl)}>
                {item.thumbnail ? (
                  <ImageBackground source={{ uri: item.thumbnail }} style={styles.thumb} imageStyle={styles.thumbImage}>
                    <Ionicons name="play-circle" size={moderateScale(26)} color={colors.textStrong} />
                  </ImageBackground>
                ) : (
                  <View style={styles.thumb}>
                    <Ionicons name="play-circle" size={moderateScale(26)} color={colors.textStrong} />
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.recentMeta}>
                <Text numberOfLines={1} style={styles.recentTitle}>
                  {item.title}
                </Text>
                <Text style={styles.recentSub}>
                  {item.source} • {item.size}
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.8} onPress={onShareRecent}>
                <Ionicons name="share-social-outline" size={moderateScale(22)} color={colors.textMuted} />
              </TouchableOpacity>
            </GlassCard>
          ))}

          {vm.recents.length > 3 ? (
            <TouchableOpacity style={styles.moreDownloadsButton} activeOpacity={0.85} onPress={() => onTabPress('Downloads')}>
              <Text style={styles.moreDownloadsText}>See more downloads</Text>
              <Ionicons name="arrow-forward" size={moderateScale(15)} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.ScrollView>

      <Modal transparent visible={detecting} animationType="fade" statusBarTranslucent>
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderCard}>
          
            <View style={styles.loaderPlatformsRow}>
              <View style={styles.loaderPlatformsWindow}>
                <Animated.View
                  style={[
                    styles.loaderPlatformsTrack,
                    {
                      transform: [{ translateX: loaderHighlightX }],
                    },
                  ]}
                >
                  {[...loaderIconOrder, loaderIconOrder[0]].map((platform, index) => (
                    <View key={`${platform.id}-${index}`} style={styles.loaderPlatformChip}>
                      <Ionicons name={platform.icon} size={moderateScale(18)} color={platform.tint} />
                    </View>
                  ))}
                </Animated.View>
                <View pointerEvents="none" style={[styles.loaderEdgeShade, styles.loaderEdgeShadeLeft]} />
                <View pointerEvents="none" style={[styles.loaderEdgeShade, styles.loaderEdgeShadeRight]} />
                <View pointerEvents="none" style={styles.loaderCenterFocus} />
              </View>
            </View>
            <Text style={styles.loaderPlatformLabel}>Scanning supported platforms...</Text>
            <Text style={styles.loaderTitle}>Preparing your download</Text>
            <Text style={styles.loaderSubtitle}>Analyzing link and fetching best media quality...</Text>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showQuickDetectModal} animationType="fade" onRequestClose={() => setShowQuickDetectModal(false)}>
        <View style={styles.quickModalOverlay}>
          <View style={styles.quickModalCard}>
            <View style={styles.quickIconWrap}>
              <Ionicons name="sparkles" size={moderateScale(20)} color="#EAF6FF" />
            </View>
            <Text style={styles.quickModalTitle}>Link Ready to Download</Text>
            <Text style={styles.quickModalSubtitle}>We found a supported link. Download and prepare this video now?</Text>
            <Text numberOfLines={2} style={styles.quickModalUrl}>{quickDetectUrl}</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.quickSecondaryButton}
                onPress={() => setShowQuickDetectModal(false)}
              >
                <Text style={styles.quickSecondaryText}>Later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.quickPrimaryButton}
                onPress={async () => {
                  setShowQuickDetectModal(false);
                  await onDetect();
                }}
              >
                <Text style={styles.quickPrimaryText}>Detect Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showDetectErrorModal} animationType="fade" onRequestClose={() => setShowDetectErrorModal(false)}>
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="alert-circle" size={moderateScale(26)} color="#FFD6D6" />
            </View>
            <Text style={styles.errorModalTitle}>Download Failed</Text>
            <Text style={styles.errorModalMessage}>{detectErrorModalMessage}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.errorModalButton}
              onPress={() => setShowDetectErrorModal(false)}
            >
              <Text style={styles.errorModalButtonText}>OK</Text>
            </TouchableOpacity>
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
    opacity: 0.10,
    borderColor: 'white',
    borderWidth: 0.5,
  },
  glowTop: {
    top: -scale(130),
    left: -scale(40),
  },
  glowBottom: {
    bottom: -scale(180),
    right: -scale(40),
  },
  content: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(45),
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: verticalScale(90),
    backgroundColor: 'rgba(4, 10, 23, 0.92)',
  },
  avatar: {
    width: scale(42),
    height: scale(42),
    borderRadius: 999,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarInitial: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(15, 0.2),
  },
  proBadge: {
    position: 'absolute',
    right: -scale(2),
    bottom: -scale(2),
    width: scale(16),
    height: scale(16),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(62, 141, 255, 0.9)',
    borderWidth: 1,
    borderColor: '#DDF0FF',
  },
  detectCard: {
    padding: scale(10),
    borderRadius: 18,
    marginBottom: verticalScale(16),
    backgroundColor: 'rgba(33, 50, 78, 0.32)',
    borderColor: 'rgba(140, 178, 230, 0.26)',
    borderWidth: 1,
    shadowColor: '#061224',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  detectInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: colors.buttonDark,
    paddingHorizontal: scale(11),
  },
  clearInputButton: {
    width: scale(28),
    height: scale(28),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(145, 178, 229, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(175, 204, 246, 0.22)',
  },
  linkIcon: {
    marginRight: scale(9),
  },
  input: {
    flex: 1,
    color: colors.textStrong,
    fontFamily: fontFamily.regular,
    fontSize: moderateScale(16, 0.25),
    paddingVertical: verticalScale(12),
  },
  detectErrorText: {
    color: '#FF9A9A',
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    marginTop: verticalScale(8),
    paddingHorizontal: scale(4),
  },
  downloadButton: {
    borderRadius: 16,
    backgroundColor: colors.primaryStrong,
    paddingVertical: verticalScale(15),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(22),
  },
  downloadButtonDisabled: {
    opacity: 0.85,
  },
  downloadButtonText: {
    color: '#0A1C33',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(20, 0.2),
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: verticalScale(20),
  },
  platformList: {
    paddingRight: scale(8),
    gap: scale(9),
  },
  platformCard: {
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    borderRadius: 18,
    gap: verticalScale(10),
    backgroundColor: 'rgba(28, 44, 70, 0.4)',
    borderColor: 'rgba(140, 178, 230, 0.22)',
    borderWidth: 1,
    shadowColor: '#081327',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  platformIconWrap: {
    width: scale(44),
    height: scale(44),
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    borderRadius: 18,
    marginBottom: verticalScale(12),
    backgroundColor: 'rgba(26, 41, 66, 0.42)',
    borderColor: 'rgba(146, 184, 238, 0.2)',
    borderWidth: 1,
    shadowColor: '#071225',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  emptyRecentCard: {
    borderRadius: 16,
    paddingVertical: verticalScale(18),
    paddingHorizontal: scale(14),
    alignItems: 'center',
    marginBottom: verticalScale(12),
    backgroundColor: 'rgba(24, 38, 62, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(121, 168, 235, 0.24)',
  },
  emptyRecentIconWrap: {
    width: scale(48),
    height: scale(48),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(8),
    backgroundColor: 'rgba(62, 141, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(151, 199, 255, 0.4)',
  },
  emptyRecentTitle: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(15, 0.2),
    marginBottom: verticalScale(4),
  },
  emptyRecentSub: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    textAlign: 'center',
    lineHeight: moderateScale(17, 0.2),
  },
  thumb: {
    width: scale(70),
    height: scale(70),
    borderRadius: 14,
    backgroundColor: 'rgba(48, 73, 112, 0.3)',
    borderColor: 'rgba(126, 170, 238, 0.2)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
    overflow: 'hidden',
  },
  thumbImage: {
    borderRadius: 14,
  },
  recentMeta: {
    flex: 1,
  },
  recentTitle: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(15, 0.2),
  },
  recentSub: {
    color: colors.textMuted,
    marginTop: verticalScale(3),
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  shareIcon: {
    color: colors.textMuted,
    fontSize: moderateScale(20, 0.2),
    paddingHorizontal: scale(4),
  },
  moreDownloadsButton: {
    marginTop: verticalScale(2),
    paddingVertical: verticalScale(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  moreDownloadsText: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  loaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 18, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  loaderCard: {
    width: '100%',
    borderRadius: 22,
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(22),
    backgroundColor: 'rgba(14, 26, 44, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(126, 170, 238, 0.28)',
    alignItems: 'center',
  },
  loaderRing: {
    width: scale(70),
    height: scale(70),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(62, 141, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(151, 199, 255, 0.35)',
  },
  loaderPlatformsRow: {
    marginTop: verticalScale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderPlatformsWindow: {
    width: LOADER_CHIP_STEP * 3,
    height: scale(40),
    borderRadius: 999,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  loaderPlatformsTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loaderCenterFocus: {
    position: 'absolute',
    left: LOADER_CHIP_STEP,
    width: LOADER_CHIP_STEP,
    height: scale(40),
    borderRadius: 999,
    backgroundColor: 'rgba(144, 194, 255, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(220, 238, 255, 0.75)',
    shadowColor: '#7EBCFF',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  loaderEdgeShade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: LOADER_CHIP_STEP,
    backgroundColor: 'rgba(8, 14, 26, 0.62)',
  },
  loaderEdgeShadeLeft: {
    left: 0,
  },
  loaderEdgeShadeRight: {
    right: 0,
  },
  loaderPlatformChip: {
    width: scale(34),
    height: scale(34),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(66, 95, 139, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(140, 183, 246, 0.26)',
    marginRight: LOADER_CHIP_STEP - scale(34),
  },
  loaderPlatformLabel: {
    marginTop: verticalScale(8),
    color: '#CBE3FF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(12, 0.2),
    textTransform: 'capitalize',
    letterSpacing: 0.4,
  },
  loaderTitle: {
    marginTop: verticalScale(14),
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(17, 0.2),
    textAlign: 'center',
  },
  loaderSubtitle: {
    marginTop: verticalScale(6),
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    lineHeight: moderateScale(18, 0.2),
    textAlign: 'center',
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 18, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  errorModalCard: {
    width: '100%',
    borderRadius: 20,
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(20),
    alignItems: 'center',
    backgroundColor: 'rgba(22, 26, 40, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 165, 0.3)',
  },
  errorIconWrap: {
    width: scale(62),
    height: scale(62),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 72, 72, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 181, 0.42)',
  },
  errorModalTitle: {
    marginTop: verticalScale(12),
    color: '#FFE7E7',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(17, 0.2),
  },
  errorModalMessage: {
    marginTop: verticalScale(8),
    color: '#FFD3D3',
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    lineHeight: moderateScale(18, 0.2),
    textAlign: 'center',
  },
  errorModalButton: {
    marginTop: verticalScale(14),
    minHeight: verticalScale(42),
    minWidth: scale(90),
    paddingHorizontal: scale(16),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(235, 83, 83, 0.88)',
  },
  errorModalButtonText: {
    color: '#FFF4F4',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  quickModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 18, 0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(22),
  },
  quickModalCard: {
    width: '100%',
    borderRadius: 20,
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(20),
    backgroundColor: 'rgba(14, 27, 46, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(124, 169, 238, 0.33)',
    alignItems: 'center',
  },
  quickIconWrap: {
    width: scale(54),
    height: scale(54),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(66, 143, 255, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(170, 209, 255, 0.52)',
  },
  quickModalTitle: {
    marginTop: verticalScale(10),
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(17, 0.2),
    textAlign: 'center',
  },
  quickModalSubtitle: {
    marginTop: verticalScale(6),
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    lineHeight: moderateScale(17, 0.2),
    textAlign: 'center',
  },
  quickModalUrl: {
    marginTop: verticalScale(8),
    color: '#DDEEFF',
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(11, 0.2),
    textAlign: 'center',
  },
  quickActionsRow: {
    marginTop: verticalScale(14),
    width: '100%',
    flexDirection: 'row',
    gap: scale(10),
  },
  quickSecondaryButton: {
    flex: 1,
    minHeight: verticalScale(42),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(121, 161, 214, 0.28)',
    backgroundColor: 'rgba(55, 72, 101, 0.35)',
  },
  quickSecondaryText: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  quickPrimaryButton: {
    flex: 1,
    minHeight: verticalScale(42),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryStrong,
  },
  quickPrimaryText: {
    color: '#0A1C33',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
});
