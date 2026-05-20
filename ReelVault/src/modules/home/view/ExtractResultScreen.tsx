import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFirebaseAuth } from '../../../common/firebase/useFirebaseAuth';
import { useUserSubscription } from '../../../common/firebase/useUserSubscription';
import { fontFamily } from '../../../common/fonts/font';
import { colors } from '../../../common/theme/colors';
import { moderateScale, scale, verticalScale } from '../../../common/utils/responsive';
import { appendSavedDownload, syncSavedDownloadToCloud } from '../../../common/storage/downloadHistory';
import { getAsyncStorageItem } from '../../../common/storage/asyncStorage';
import { AppHeader } from '../../../common/widgets/AppHeader';
import { GlassCard } from '../../../common/widgets/GlassCard';
import { InstaGradientBackdrop } from '../../../common/widgets/InstaGradientBackdrop';

type ExtractResultScreenProps = {
  sourceUrl: string;
  title: string;
  videoUrl: string;
  platformName: string;
  thumbnailUrl?: string | null;
  onBack: () => void;
};

type QualitySelectionValue = 'ask' | 'best' | 'high' | 'dataSaver';
type SaveQualityOption = {
  id: string;
  label: string;
  value: string;
};

const QUALITY_SELECTION_STORAGE_KEY = 'reelvault.settings.quality_selection';

const ASK_QUALITY_OPTIONS: SaveQualityOption[] = [
  { id: '720', label: 'Save as 720p', value: '720p' },
  { id: '1080', label: 'Save as 1080p', value: '1080p' },
  { id: '4k', label: 'Save as 4K', value: '4K' },
];

const qualityLabelFromSetting = (setting: QualitySelectionValue) => {
  if (setting === 'best') return 'Best';
  if (setting === 'high') return '1080p';
  if (setting === 'dataSaver') return '720p';
  return 'Ask';
};

const buildSafeFileName = (rawTitle: string, quality: string) => {
  const sanitizedTitle = rawTitle
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40) || 'reelvault_video';
  const qualitySuffix = quality.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `${sanitizedTitle}_${qualitySuffix}_${Date.now()}.mp4`;
};

const getPlatformThumbnail = (platformName: string) => {
  const normalized = platformName.toLowerCase();
  if (normalized.includes('instagram')) {
    return 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=1200&q=80';
  }
  if (normalized.includes('facebook')) {
    return 'https://images.unsplash.com/photo-1611605698335-8b1569810432?auto=format&fit=crop&w=1200&q=80';
  }
  if (normalized.includes('youtube')) {
    return 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=1200&q=80';
  }
  return 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=1200&q=80';
};

const normalizeSaveErrorMessage = (error: unknown) => {
  const fallback = 'Failed to save video. Please try again.';
  const message = error instanceof Error ? error.message : String(error || '');
  const lowered = message.toLowerCase();
  if (!message) return fallback;
  if (lowered.includes('unknown error from a native module')) {
    return 'Native save failed. Please check Photos permission and try again.';
  }
  if (lowered.includes('permission')) {
    return 'Permission denied. Please allow Photos access in Settings.';
  }
  return message;
};

export const ExtractResultScreen = ({ sourceUrl, title, videoUrl, platformName, thumbnailUrl, onBack }: ExtractResultScreenProps) => {
  const { width: screenWidth } = useWindowDimensions();
  const authVm = useFirebaseAuth();
  const subscriptionVm = useUserSubscription(authVm.user?.uid);
  const [preferredQuality, setPreferredQuality] = useState<QualitySelectionValue>('ask');
  const [showQualityPicker, setShowQualityPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedQualityLabel, setSavedQualityLabel] = useState<string | null>(null);
  const [thumbnailAspectRatio, setThumbnailAspectRatio] = useState<number>(9 / 16);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayThumbnail = thumbnailUrl || getPlatformThumbnail(platformName);
  const cardInnerWidth = Math.max(1, screenWidth - scale(64));
  const thumbnailHeight = Math.max(verticalScale(220), cardInnerWidth / thumbnailAspectRatio);

  useEffect(() => {
    const loadPreferredQuality = async () => {
      const savedSetting = await getAsyncStorageItem(QUALITY_SELECTION_STORAGE_KEY);
      if (savedSetting === 'ask' || savedSetting === 'best' || savedSetting === 'high' || savedSetting === 'dataSaver') {
        setPreferredQuality(savedSetting);
      }
    };
    loadPreferredQuality().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!displayThumbnail?.trim()) {
      setThumbnailAspectRatio(9 / 16);
      return;
    }
    let active = true;
    Image.getSize(
      displayThumbnail,
      (imgWidth, imgHeight) => {
        if (!active || imgWidth <= 0 || imgHeight <= 0) {
          return;
        }
        setThumbnailAspectRatio(imgWidth / imgHeight);
      },
      () => {
        if (active) {
          setThumbnailAspectRatio(9 / 16);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [displayThumbnail]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const openSaveSuccessModal = (quality: string) => {
    setSavedQualityLabel(quality);
    setShowSuccessModal(true);
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }
    redirectTimerRef.current = setTimeout(() => {
      setShowSuccessModal(false);
      onBack();
    }, 1600);
  };

  const saveExtraction = async (quality: string) => {
    const record = {
      id: `${Date.now()}`,
      title,
      sourceUrl,
      videoUrl,
      thumbnailUrl: thumbnailUrl || getPlatformThumbnail(platformName),
      quality,
      platformName,
      savedAt: new Date().toISOString(),
    };
    await appendSavedDownload(record);
    if (authVm.user?.uid && subscriptionVm.isPro) {
      await syncSavedDownloadToCloud(authVm.user.uid, record);
    }
  };

  const downloadAndSaveMedia = async (quality: string) => {
    const fileName = buildSafeFileName(title, quality);
    const appDownloadsDir = `${RNFS.DocumentDirectoryPath}/ReelVault Downloads`;
    const appFilePath = `${appDownloadsDir}/${fileName}`;

    await RNFS.mkdir(appDownloadsDir);

    const job = RNFS.downloadFile({
      fromUrl: videoUrl,
      toFile: appFilePath,
      background: true,
      discretionary: true,
      headers: {
        Accept: '*/*',
        'User-Agent': 'ReelVault/1.0',
      },
    });
    const result = await job.promise;
    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(`Download failed with status code ${result.statusCode}.`);
    }
    await CameraRoll.save(`file://${appFilePath}`, { type: 'video' });
  };

  const saveAll = async (quality: string) => {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await saveExtraction(quality);
      await downloadAndSaveMedia(quality);
      setSaveMessage(`Saved to Gallery and Files (${quality})`);
      openSaveSuccessModal(quality);
    } catch (err) {
      setSaveError(normalizeSaveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onPressSave = async () => {
    if (preferredQuality === 'ask') {
      setShowQualityPicker(true);
      return;
    }
    const quality = qualityLabelFromSetting(preferredQuality);
    await saveAll(quality);
  };

  const openSourceLink = async () => {
    try {
      await Linking.openURL(sourceUrl);
    } catch {
      setSaveError('Unable to open source link.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <InstaGradientBackdrop variant="light" />
      <View style={styles.content}>
        <AppHeader title="Result" showBack onBack={onBack} tone="light" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
          alwaysBounceVertical
          keyboardShouldPersistTaps="handled"
        >
          <GlassCard style={styles.resultCard}>
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={moderateScale(18)} color={colors.success} />
              <Text style={styles.statusText}>Now you can save the video to your gallery and files</Text>
            </View>

            <View style={styles.thumbnailWrap}>
              <Image source={{ uri: displayThumbnail }} style={[styles.thumbnailImage, { height: thumbnailHeight }]} resizeMode="stretch" />
            </View>

            <Text style={styles.label}>Title</Text>
            <Text style={styles.value}>{title}</Text>

            {platformName === 'Instagram' ? (
              <TouchableOpacity activeOpacity={0.85} style={[styles.actionButton, styles.actionButtonInstagram]} onPress={openSourceLink}>
                <Ionicons name="logo-instagram" size={moderateScale(18)} color="#FFFFFF" />
                <Text style={styles.actionButtonTextLight}>Open on Instagram</Text>
              </TouchableOpacity>
            ) : platformName === 'Facebook' ? (
              <TouchableOpacity activeOpacity={0.85} style={[styles.actionButton, styles.actionButtonFacebook]} onPress={openSourceLink}>
                <Ionicons name="logo-facebook" size={moderateScale(18)} color="#FFFFFF" />
                <Text style={styles.actionButtonTextLight}>Open on Facebook</Text>
              </TouchableOpacity>
            ) : platformName === 'YouTube' ? (
              <TouchableOpacity activeOpacity={0.85} style={[styles.actionButton, styles.actionButtonYoutube]} onPress={openSourceLink}>
                <Ionicons name="logo-youtube" size={moderateScale(18)} color="#FFFFFF" />
                <Text style={styles.actionButtonTextLight}>Open on YouTube</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.saveSection}>
              <TouchableOpacity activeOpacity={0.85} style={styles.saveButton} onPress={onPressSave} disabled={saving}>
                <Ionicons name="download" size={moderateScale(16)} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Video'}</Text>
              </TouchableOpacity>

              {saveMessage ? <Text style={styles.successText}>{saveMessage}</Text> : null}
              {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
            </View>
          </GlassCard>
        </ScrollView>
      </View>

      <Modal transparent visible={showQualityPicker} animationType="fade" onRequestClose={() => setShowQualityPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Quality</Text>
            <Text style={styles.modalSubtitle}>Your setting is "Always Ask", so select quality for this save.</Text>

            <View style={styles.optionsWrap}>
              {ASK_QUALITY_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.id}
                  activeOpacity={0.85}
                  style={styles.optionItem}
                  onPress={() => {
                    setShowQualityPicker(false);
                    saveAll(option.value).catch(() => undefined);
                  }}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                  <Ionicons name="chevron-forward" size={moderateScale(16)} color={colors.textDimOnLight} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity activeOpacity={0.85} style={styles.cancelButton} onPress={() => setShowQualityPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={moderateScale(28)} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Download Complete</Text>
            <Text style={styles.successSubtitle}>
              Video saved in Gallery and Files {savedQualityLabel ? `(${savedQualityLabel})` : ''}.
            </Text>
            <Text style={styles.successFootnote}>Returning to Home...</Text>
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
    flex: 1,
    zIndex: 1,
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(8),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: verticalScale(28),
  },
  resultCard: {
    borderRadius: 18,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  thumbnailWrap: {
    borderRadius: 14,
    backgroundColor: colors.inputSurfaceLight,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    marginBottom: verticalScale(10),
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  statusText: {
    flex: 1,
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  label: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(12, 0.2),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(4),
  },
  value: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(16, 0.2),
  },
  actionButton: {
    marginTop: verticalScale(14),
    minHeight: verticalScale(46),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: scale(8),
  },
  actionButtonInstagram: {
    backgroundColor: '#E1306C',
  },
  actionButtonFacebook: {
    backgroundColor: '#1877F2',
  },
  actionButtonYoutube: {
    backgroundColor: '#FF0000',
  },
  actionButtonTextLight: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(14, 0.2),
  },
  saveButton: {
    minHeight: verticalScale(48),
    borderRadius: 14,
    backgroundColor: colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: scale(8),
    shadowColor: '#E1306C',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  saveSection: {
    marginTop: verticalScale(22),
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(14, 0.2),
  },
  successText: {
    marginTop: verticalScale(8),
    color: colors.success,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  errorText: {
    marginTop: verticalScale(8),
    color: colors.primaryStrong,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlayLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(18),
  },
  modalCard: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalTitle: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(18, 0.2),
  },
  modalSubtitle: {
    marginTop: verticalScale(4),
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    lineHeight: moderateScale(17, 0.2),
  },
  optionsWrap: {
    marginTop: verticalScale(12),
    gap: verticalScale(8),
  },
  optionItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    backgroundColor: colors.lightSurfaceMuted,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  cancelButton: {
    marginTop: verticalScale(12),
    minHeight: verticalScale(42),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.lightBorderStrong,
    backgroundColor: colors.lightSurfaceMuted,
  },
  cancelText: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  successOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlayLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  successCard: {
    width: '100%',
    borderRadius: 22,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(22),
    alignItems: 'center',
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  successIconWrap: {
    width: scale(64),
    height: scale(64),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  successTitle: {
    marginTop: verticalScale(12),
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(18, 0.2),
    textAlign: 'center',
  },
  successSubtitle: {
    marginTop: verticalScale(6),
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    lineHeight: moderateScale(18, 0.2),
    textAlign: 'center',
  },
  successFootnote: {
    marginTop: verticalScale(10),
    color: colors.primaryStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(12, 0.2),
    textAlign: 'center',
  },
});
