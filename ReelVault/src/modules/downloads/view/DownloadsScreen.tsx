import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  ImageBackground,
  Linking,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useFocusEffect } from '@react-navigation/native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontFamily } from '../../../common/fonts/font';
import { removeSavedDownload } from '../../../common/storage/downloadHistory';
import { colors } from '../../../common/theme/colors';
import { moderateScale, scale, verticalScale } from '../../../common/utils/responsive';
import { GlassCard } from '../../../common/widgets/GlassCard';
import { InstaGradientBackdrop } from '../../../common/widgets/InstaGradientBackdrop';
import { AppHeader } from '../../../common/widgets/AppHeader';
import { shareAppPromo } from '../../../common/utils/shareApp';
import { useDownloadsViewModel } from '../viewmodel/useDownloadsViewModel';

export const DownloadsScreen = () => {
  const vm = useDownloadsViewModel();
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');

  const selectedItem = vm.completedDownloads.find(item => item.id === selectedItemId) ?? null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 340,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 340,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslateY]);

  useFocusEffect(
    React.useCallback(() => {
      vm.reloadHistory?.();
    }, [vm.reloadHistory]),
  );

  const downloadToFilesAndGallery = async (item: NonNullable<typeof selectedItem>) => {
    if (!item.videoUrl) {
      throw new Error('Missing video URL for this history item.');
    }
    const fileName = `${item.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_').slice(0, 38) || 'download'}_${Date.now()}.mp4`;
    const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    const appDownloadsDir = `${RNFS.DocumentDirectoryPath}/ReelVault Downloads`;
    const appFilePath = `${appDownloadsDir}/${fileName}`;
    await RNFS.mkdir(appDownloadsDir);
    const result = await RNFS.downloadFile({
      fromUrl: item.videoUrl,
      toFile: cachePath,
      background: true,
      discretionary: true,
      headers: {
        Accept: '*/*',
        'User-Agent': 'ReelVault/1.0',
      },
    }).promise;
    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(`Download failed (${result.statusCode}).`);
    }
    await RNFS.copyFile(cachePath, appFilePath);
    await CameraRoll.save(`file://${cachePath}`, { type: 'video' });
    await RNFS.unlink(cachePath).catch(() => undefined);
  };

  const onDeleteItem = async () => {
    if (!selectedItem) {
      return;
    }
    setActionLoading(true);
    try {
      await removeSavedDownload(selectedItem.id);
      setSelectedItemId(null);
      await vm.reloadHistory?.();
    } finally {
      setActionLoading(false);
    }
  };

  const onShareItem = async () => {
    await shareAppPromo();
  };

  const onDownloadAgain = async () => {
    if (!selectedItem) {
      return;
    }
    setActionLoading(true);
    try {
      await downloadToFilesAndGallery(selectedItem);
      setSelectedItemId(null);
      setSuccessMessage('Saved successfully to Gallery and Files.');
      setShowSuccessModal(true);
    } finally {
      setActionLoading(false);
    }
  };

  const onOpenSourceUrl = async (sourceUrl?: string) => {
    if (!sourceUrl) {
      Alert.alert('Source Not Available', 'Original source link is not available for this item.');
      return;
    }
    try {
      await Linking.openURL(sourceUrl);
    } catch {
      Alert.alert('Unable to Open Link', 'Could not open the original source link.');
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
        <AppHeader title="Downloads" tone="light" />
        <Text style={styles.sectionLabel}>DOWNLOAD HISTORY</Text>

        {vm.completedDownloads.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cloud-download-outline" size={moderateScale(26)} color={colors.primaryStrong} />
            </View>
            <Text style={styles.emptyTitle}>No Downloads Yet</Text>
            <Text style={styles.emptySub}>
              Detect a link and tap save. Your downloaded history will appear here with premium sync.
            </Text>
          </GlassCard>
        ) : null}

        {vm.completedDownloads.map(item => (
          <GlassCard key={item.id} style={styles.completedCard}>
            {item.thumbnail ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenSourceUrl(item.sourceUrl)}>
                <ImageBackground source={{ uri: item.thumbnail }} style={styles.thumbnail} imageStyle={styles.thumbImage}>
                  <View style={styles.playButton}>
                    <Ionicons name="play" size={moderateScale(20)} color="#FFFFFF" />
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenSourceUrl(item.sourceUrl)}>
                <View style={[styles.thumbnail, styles.thumbnailFallback]}>
                  <Ionicons name="film-outline" size={moderateScale(24)} color={colors.textDimOnLight} />
                </View>
              </TouchableOpacity>
            )}
            <View style={styles.cardMeta}>
              <Text numberOfLines={2} ellipsizeMode="tail" style={styles.cardTitle}>
                {item.title}
              </Text>
              <View style={styles.sourceRow}>
                <MaterialDesignIcons name="record-circle-outline" size={moderateScale(13)} color={colors.textDimOnLight} />
                <Text style={styles.cardSub}>
                  {item.source} • {item.size}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    await shareAppPromo();
                  }}
                  style={styles.shareAction}
                >
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.menuButton} activeOpacity={0.8} onPress={() => setSelectedItemId(item.id)}>
              <Ionicons name="ellipsis-vertical" size={moderateScale(16)} color={colors.textDimOnLight} />
            </TouchableOpacity>
          </GlassCard>
        ))}
      </Animated.ScrollView>

      <Modal transparent visible={Boolean(selectedItem)} animationType="fade" onRequestClose={() => setSelectedItemId(null)}>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard}>
            <View style={styles.modalTitleWrap}>
              <Ionicons name={selectedItem?.source === 'Instagram' ? 'logo-instagram' : selectedItem?.source === 'Facebook' ? 'logo-facebook' : selectedItem?.source === 'YouTube' ? 'logo-youtube' : 'download-outline'} size={moderateScale(18)} color={colors.primaryStrong} />
              <Text style={styles.modalTitle}>{selectedItem?.title || 'Unknown Title'}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} style={styles.modalAction} onPress={onShareItem} disabled={actionLoading}>
              <Ionicons name="share-social-outline" size={moderateScale(18)} color={colors.textOnLight} />
              <Text style={styles.modalActionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={styles.modalAction} onPress={onDownloadAgain} disabled={actionLoading}>
              <Ionicons name="download-outline" size={moderateScale(18)} color={colors.textOnLight} />
              <Text style={styles.modalActionText}>{actionLoading ? 'Please wait...' : 'Save to Gallery & Files'}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={[styles.modalAction, styles.modalDeleteAction]} onPress={onDeleteItem} disabled={actionLoading}>
              <Ionicons name="trash-outline" size={moderateScale(18)} color={colors.primaryStrong} />
              <Text style={styles.modalDeleteText}>Delete from History</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={styles.modalCloseButton} onPress={() => setSelectedItemId(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>

      <Modal transparent visible={showSuccessModal} animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={moderateScale(30)} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Saved Successfully</Text>
            <Text style={styles.successSubtitle}>{successMessage}</Text>
            <Text style={styles.successHint}>You can find it in Photos and Files.</Text>
            <TouchableOpacity activeOpacity={0.85} style={styles.successButton} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.successButtonText}>Great</Text>
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
    marginHorizontal: scale(18),
    marginTop: verticalScale(10),
    paddingBottom: verticalScale(55),
  },
  sectionLabel: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(12, 0.2),
    letterSpacing: 1.2,
    marginBottom: verticalScale(10),
  },
  emptyCard: {
    borderRadius: 16,
    paddingVertical: verticalScale(22),
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(16),
    alignItems: 'center',
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  emptyIconWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(10),
    backgroundColor: 'rgba(225, 48, 108, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.2)',
  },
  emptyTitle: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(17, 0.2),
    marginBottom: verticalScale(6),
  },
  emptySub: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    lineHeight: moderateScale(18, 0.2),
    textAlign: 'center',
  },
  completedCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: verticalScale(14),
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  thumbnail: {
    height: verticalScale(185),
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailFallback: {
    backgroundColor: colors.inputSurfaceLight,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  thumbImage: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  playButton: {
    width: scale(46),
    height: scale(46),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(225, 48, 108, 0.85)',
  },
  cardMeta: {
    paddingHorizontal: scale(12),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(14),
  },
  cardTitle: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(18, 0.24),
    marginBottom: verticalScale(6),
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  shareAction: {
    marginLeft: 'auto',
    padding: scale(4),
  },
  cardSub: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.2),
  },
  menuButton: {
    position: 'absolute',
    right: scale(8),
    bottom: verticalScale(14),
    padding: scale(4),
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
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(10),
  },
  modalTitle: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(16, 0.2),
  },
  modalAction: {
    borderRadius: 12,
    minHeight: verticalScale(44),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: colors.lightBorder,
    backgroundColor: colors.lightSurfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  modalActionText: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  modalDeleteAction: {
    borderColor: 'rgba(225, 48, 108, 0.28)',
    backgroundColor: 'rgba(225, 48, 108, 0.08)',
  },
  modalDeleteText: {
    color: colors.primaryStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  modalCloseButton: {
    marginTop: verticalScale(2),
    minHeight: verticalScale(42),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.lightBorderStrong,
    backgroundColor: colors.lightSurfaceMuted,
  },
  modalCloseText: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  successOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlayLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(22),
  },
  successCard: {
    width: '100%',
    borderRadius: 24,
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
    width: scale(74),
    height: scale(74),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderWidth: 0,
  },
  successTitle: {
    marginTop: verticalScale(12),
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(19, 0.2),
    textAlign: 'center',
  },
  successSubtitle: {
    marginTop: verticalScale(8),
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.2),
    lineHeight: moderateScale(19, 0.2),
    textAlign: 'center',
  },
  successHint: {
    marginTop: verticalScale(6),
    color: colors.textDimOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    textAlign: 'center',
  },
  successButton: {
    marginTop: verticalScale(14),
    minHeight: verticalScale(44),
    borderRadius: 12,
    paddingHorizontal: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryStrong,
  },
  successButtonText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(14, 0.2),
  },
});
