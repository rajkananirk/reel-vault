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
  ScrollView,
  StatusBar,
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
import { InstaGradientBackdrop } from '../../../common/widgets/InstaGradientBackdrop';
import { SectionHeader } from '../../../common/widgets/SectionHeader';
import { AppHeader } from '../../../common/widgets/AppHeader';
import { canReadClipboardForDetect, setClipboardPasteDeclined } from '../../../common/storage/clipboardSettings';
import {
  extractSupportedVideoUrl,
  isSupportedSourceUrl,
} from '../../../common/utils/supportedVideoUrl';
import { shareAppPromo } from '../../../common/utils/shareApp';
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
  pendingDeepLinkUrl?: string | null;
  onPendingDeepLinkHandled?: () => void;
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
  const fallback = 'https://video-downloader-5jxb.onrender.com';
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
  { id: 'instagram', icon: 'logo-instagram', tint: '#E1306C' },
  { id: 'facebook', icon: 'logo-facebook', tint: '#1877F2' },
  { id: 'youtube', icon: 'logo-youtube', tint: '#FF0000' },
];
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
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? 'U'}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  const single = parts[0] ?? 'User';
  return single.slice(0, 2).toUpperCase();
};

const getPlatformName = (url: string) => {
  const normalized = url.toLowerCase();
  if (normalized.includes('instagram.com')) return 'Instagram';
  if (normalized.includes('facebook.com')) return 'Facebook';
  if (normalized.includes('youtube.com')) return 'YouTube';
  if (normalized.includes('youtu.be')) return 'YouTube';
  return 'Unknown';
};

const isClipboardPermissionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    lowered.includes('paste') ||
    lowered.includes('clipboard') ||
    lowered.includes('permission') ||
    lowered.includes('denied') ||
    lowered.includes('not allowed')
  );
};

const getClipboardText = async (): Promise<string> => {
  const clipboardModule = NativeModules?.Clipboard;
  if (!clipboardModule) {
    return '';
  }

  try {
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
  } catch (error) {
    if (isClipboardPermissionError(error)) {
      await setClipboardPasteDeclined(true);
    }
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

export const HomeScreen = ({ onTabPress, onOpenExtractResult, pendingDeepLinkUrl, onPendingDeepLinkHandled }: HomeScreenProps) => {
  const vm = useHomeViewModel();
  const authVm = useFirebaseAuth();
  const subscriptionVm = useUserSubscription(authVm.user?.uid);
  const displayName = getUserDisplayName(authVm.user?.displayName, authVm.user?.email);
  const userInitials = getInitials(displayName);
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
  const isMountedRef = useRef(true);
  const quickDetectInFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingDeepLinkUrl?.trim()) {
      return;
    }
    const supportedUrl = extractSupportedVideoUrl(pendingDeepLinkUrl) ?? pendingDeepLinkUrl.trim();
    vm.setUrl(supportedUrl);
    onPendingDeepLinkHandled?.();
  }, [pendingDeepLinkUrl, onPendingDeepLinkHandled, vm]);

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
    }, [vm.reloadHistory]),
  );

  const triggerQuickDetectPrompt = React.useCallback((supportedUrl: string) => {
    if (detecting || quickDetectInFlightRef.current) {
      return;
    }

    if (!supportedUrl || !isSupportedSourceUrl(supportedUrl) || supportedUrl === lastQuickPromptedUrlRef.current) {
      return;
    }

    quickDetectInFlightRef.current = true;
    lastQuickPromptedUrlRef.current = supportedUrl;

    requestAnimationFrame(() => {
      if (!isMountedRef.current) {
        quickDetectInFlightRef.current = false;
        return;
      }
      vm.setUrl(supportedUrl);
      setQuickDetectUrl(supportedUrl);
      setShowQuickDetectModal(true);
      quickDetectInFlightRef.current = false;
    });
  }, [detecting, vm]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const checkClipboardOnce = async () => {
        if (!active || detecting || showQuickDetectModal) {
          return;
        }

        const allowed = await canReadClipboardForDetect();
        if (!allowed) {
          return;
        }

        try {
          const clipboardValue = (await getClipboardText())?.trim() ?? '';
          if (!active) {
            return;
          }

          if (!clipboardValue) {
            return;
          }

          if (clipboardValue === lastClipboardValueRef.current) {
            return;
          }

          lastClipboardValueRef.current = clipboardValue;

          const supportedUrl = extractSupportedVideoUrl(clipboardValue);
          if (!supportedUrl) {
            return;
          }

          triggerQuickDetectPrompt(supportedUrl);
        } catch (error) {
          if (isClipboardPermissionError(error)) {
            await setClipboardPasteDeclined(true);
          }
        }
      };

      const timeoutId = setTimeout(() => {
        checkClipboardOnce().catch(() => undefined);
      }, 500);

      return () => {
        active = false;
        clearTimeout(timeoutId);
      };
    }, [detecting, showQuickDetectModal, triggerQuickDetectPrompt]),
  );

  const onDetect = async () => {
    if (detecting) {
      return;
    }

    const sourceUrl = extractSupportedVideoUrl(vm.url) ?? vm.url.trim();
    if (!sourceUrl) {
      const message = 'Please paste a URL first.';
      setDetectError(message);
      setDetectErrorModalMessage(message);
      setShowDetectErrorModal(true);
      return;
    }

    if (!sourceUrl || !isSupportedSourceUrl(sourceUrl)) {
      const message = 'Unsupported URL. Only Instagram, Facebook, and YouTube links are allowed.';
      setDetectError(message);
      setDetectErrorModalMessage(message);
      setShowDetectErrorModal(true);
      return;
    }

    if (sourceUrl !== vm.url) {
      vm.setUrl(sourceUrl);
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

      if (!isMountedRef.current) {
        return;
      }

      setShowQuickDetectModal(false);
      onOpenExtractResult({
        sourceUrl,
        title: String(title).slice(0, 200),
        videoUrl: String(videoUrl),
        platformName: getPlatformName(sourceUrl),
        thumbnailUrl: body?.thumbnail_url ?? null,
      });
      await clearClipboardText().catch(() => undefined);
      lastClipboardValueRef.current = '';
      lastQuickPromptedUrlRef.current = '';
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
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
    await shareAppPromo();
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
      <StatusBar barStyle="dark-content" />
      <InstaGradientBackdrop variant="light" />
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={{ zIndex: 1, opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}
      >
        <AppHeader
          title={vm.appName}
          tone="light"
          right={
            <View style={styles.avatar}>
              {authVm.user ? (
                <Text style={styles.avatarInitials}>{""}</Text>
              ) : (
                <Ionicons name="person" size={moderateScale(18)} color={colors.textOnLight} />
              )}
              {subscriptionVm.isPro ? (
                <View style={styles.proBadge}>
                  <Ionicons name="sparkles" size={moderateScale(8)} color="#FFFFFF" />
                </View>
              ) : null}
            </View>
          }
        />

        <GlassCard style={styles.detectCard}>
          <View style={styles.detectInputWrap}>
            <Ionicons name="link-outline" size={moderateScale(18)} color={colors.textDimOnLight} style={styles.linkIcon} />
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
                if (showQuickDetectModal) {
                  setShowQuickDetectModal(false);
                }
              }}
              placeholder="Paste link here..."
              placeholderTextColor={colors.textDimOnLight}
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
                  setShowQuickDetectModal(false);
                  lastQuickPromptedUrlRef.current = '';
                }}
              >
                <Ionicons name="close" size={moderateScale(16)} color={colors.textOnLight} />
              </TouchableOpacity>
            ) : null}
          </View>
          {detectError ? <Text style={styles.detectErrorText}>{detectError}</Text> : null}
        </GlassCard>

        <TouchableOpacity style={[styles.downloadButton, detecting ? styles.downloadButtonDisabled : null]} activeOpacity={0.85} disabled={detecting} onPress={onDetect}>
          <MaterialDesignIcons name="download-outline" size={moderateScale(22)} color="#FFFFFF" />
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
                    <Ionicons name="play-circle" size={moderateScale(26)} color={colors.primaryStrong} />
                  </ImageBackground>
                ) : (
                  <View style={styles.thumb}>
                    <Ionicons name="play-circle" size={moderateScale(26)} color={colors.primaryStrong} />
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
                <Ionicons name="share-social-outline" size={moderateScale(22)} color={colors.textDimOnLight} />
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
              <Ionicons name="sparkles" size={moderateScale(20)} color={colors.primaryStrong} />
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
              <Ionicons name="alert-circle" size={moderateScale(26)} color={colors.primaryStrong} />
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
    backgroundColor: colors.lightCanvas,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(45),
  },
  avatar: {
    width: scale(42),
    height: scale(42),
    borderRadius: 999,
    backgroundColor: colors.lightSurfaceMuted,
    borderWidth: 1,
    borderColor: colors.lightBorderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarInitials: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
    letterSpacing: 0.3,
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
    backgroundColor: 'rgba(225, 48, 108, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 220, 128, 0.55)',
  },
  detectCard: {
    padding: scale(10),
    borderRadius: 18,
    marginBottom: verticalScale(16),
    backgroundColor: colors.lightSurface,
    borderColor: colors.lightBorder,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  detectInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: colors.inputSurfaceLight,
    paddingHorizontal: scale(11),
  },
  clearInputButton: {
    width: scale(28),
    height: scale(28),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(225, 48, 108, 0.1)',
    borderWidth: 1,
    borderColor: colors.lightBorder,
  },
  linkIcon: {
    marginRight: scale(9),
  },
  input: {
    flex: 1,
    color: colors.textOnLight,
    fontFamily: fontFamily.regular,
    fontSize: moderateScale(16, 0.25),
    paddingVertical: verticalScale(12),
  },
  detectErrorText: {
    color: colors.primaryStrong,
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
    color: '#FFFFFF',
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
    backgroundColor: colors.lightSurface,
    borderColor: colors.lightBorder,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  platformIconWrap: {
    width: scale(44),
    height: scale(44),
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformLabel: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    borderRadius: 18,
    marginBottom: verticalScale(12),
    backgroundColor: colors.lightSurface,
    borderColor: colors.lightBorder,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  emptyRecentCard: {
    borderRadius: 16,
    paddingVertical: verticalScale(18),
    paddingHorizontal: scale(14),
    alignItems: 'center',
    marginBottom: verticalScale(12),
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  emptyRecentIconWrap: {
    width: scale(48),
    height: scale(48),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(8),
    backgroundColor: 'rgba(225, 48, 108, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.2)',
  },
  emptyRecentTitle: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(15, 0.2),
    marginBottom: verticalScale(4),
  },
  emptyRecentSub: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    textAlign: 'center',
    lineHeight: moderateScale(17, 0.2),
  },
  thumb: {
    width: scale(70),
    height: scale(70),
    borderRadius: 14,
    backgroundColor: colors.inputSurfaceLight,
    borderColor: colors.lightBorder,
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
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(15, 0.2),
  },
  recentSub: {
    color: colors.textMutedOnLight,
    marginTop: verticalScale(3),
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  shareIcon: {
    color: colors.textDimOnLight,
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
    color: colors.primaryStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  loaderOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlayLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  loaderCard: {
    width: '100%',
    borderRadius: 22,
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(22),
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  loaderRing: {
    width: scale(70),
    height: scale(70),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(225, 48, 108, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.2)',
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
    backgroundColor: colors.inputSurfaceLight,
    borderWidth: 1,
    borderColor: colors.lightBorder,
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
    backgroundColor: 'rgba(225, 48, 108, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.22)',
    shadowColor: '#E1306C',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  loaderEdgeShade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: LOADER_CHIP_STEP,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
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
    backgroundColor: colors.inputSurfaceLight,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    marginRight: LOADER_CHIP_STEP - scale(34),
  },
  loaderPlatformLabel: {
    marginTop: verticalScale(8),
    color: colors.primaryStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(12, 0.2),
    textTransform: 'capitalize',
    letterSpacing: 0.4,
  },
  loaderTitle: {
    marginTop: verticalScale(14),
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(17, 0.2),
    textAlign: 'center',
  },
  loaderSubtitle: {
    marginTop: verticalScale(6),
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    lineHeight: moderateScale(18, 0.2),
    textAlign: 'center',
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlayLight,
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
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  errorIconWrap: {
    width: scale(62),
    height: scale(62),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(225, 48, 108, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.22)',
  },
  errorModalTitle: {
    marginTop: verticalScale(12),
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(17, 0.2),
  },
  errorModalMessage: {
    marginTop: verticalScale(8),
    color: colors.textMutedOnLight,
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
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  quickModalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlayLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(22),
  },
  quickModalCard: {
    width: '100%',
    borderRadius: 20,
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(20),
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  quickIconWrap: {
    width: scale(54),
    height: scale(54),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(225, 48, 108, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.2)',
  },
  quickModalTitle: {
    marginTop: verticalScale(10),
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(17, 0.2),
    textAlign: 'center',
  },
  quickModalSubtitle: {
    marginTop: verticalScale(6),
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    lineHeight: moderateScale(17, 0.2),
    textAlign: 'center',
  },
  quickModalUrl: {
    marginTop: verticalScale(8),
    color: colors.textDimOnLight,
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
    borderColor: colors.lightBorderStrong,
    backgroundColor: colors.lightSurfaceMuted,
  },
  quickSecondaryText: {
    color: colors.textOnLight,
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
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
});
