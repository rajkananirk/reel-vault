import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  ImageBackground,
  Linking,
  Modal,
  Platform,
  Share,
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
import { AppHeader } from '../../../common/widgets/AppHeader';
import { useDownloadsViewModel } from '../viewmodel/useDownloadsViewModel';

const APP_PROMO_MESSAGE =
  'I am using ReelVault to save videos from Instagram, Facebook, and YouTube with one tap. Try ReelVault for fast downloads and premium history sync.';

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
    }, [vm]),
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
    await Share.share(
      Platform.OS === 'ios'
        ? { message: APP_PROMO_MESSAGE }
        : { message: APP_PROMO_MESSAGE },
    );
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
      <StatusBar barStyle="light-content" />
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />

      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}
      >
        <AppHeader title="Downloads" />
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
                    <Ionicons name="play" size={moderateScale(20)} color="#EAF3FF" />
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenSourceUrl(item.sourceUrl)}>
                <View style={[styles.thumbnail, styles.thumbnailFallback]}>
                  <Ionicons name="film-outline" size={moderateScale(24)} color={colors.textStrong} />
                </View>
              </TouchableOpacity>
            )}
            <View style={styles.cardMeta}>
              <Text numberOfLines={2} ellipsizeMode="tail" style={styles.cardTitle}>
                {item.title}
              </Text>
              <View style={styles.sourceRow}>
                <MaterialDesignIcons name="record-circle-outline" size={moderateScale(13)} color={colors.textDim} />
                <Text style={styles.cardSub}>
                  {item.source} • {item.size}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    await Share.share(
                      Platform.OS === 'ios'
                        ? { message: APP_PROMO_MESSAGE }
                        : { message: APP_PROMO_MESSAGE },
                    );
                  }}
                  style={styles.shareAction}
                >
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.menuButton} activeOpacity={0.8} onPress={() => setSelectedItemId(item.id)}>
              <Ionicons name="ellipsis-vertical" size={moderateScale(16)} color={colors.textMuted} />
            </TouchableOpacity>
          </GlassCard>
        ))}
      </Animated.ScrollView>

      <Modal transparent visible={Boolean(selectedItem)} animationType="fade" onRequestClose={() => setSelectedItemId(null)}>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard}>
            <View style={styles.modalTitleWrap}>
              <Ionicons name={selectedItem?.source === 'Instagram' ? 'logo-instagram' : selectedItem?.source === 'Facebook' ? 'logo-facebook' : selectedItem?.source === 'YouTube' ? 'logo-youtube' : 'download-outline'} size={moderateScale(18)} color="white" />
              <Text style={styles.modalTitle}>{selectedItem?.title || 'Unknown Title'}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} style={styles.modalAction} onPress={onShareItem} disabled={actionLoading}>
              <Ionicons name="share-social-outline" size={moderateScale(18)} color={colors.textStrong} />
              <Text style={styles.modalActionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={styles.modalAction} onPress={onDownloadAgain} disabled={actionLoading}>
              <Ionicons name="download-outline" size={moderateScale(18)} color={colors.textStrong} />
              <Text style={styles.modalActionText}>{actionLoading ? 'Please wait...' : 'Save to Gallery & Files'}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={[styles.modalAction, styles.modalDeleteAction]} onPress={onDeleteItem} disabled={actionLoading}>
              <Ionicons name="trash-outline" size={moderateScale(18)} color="#FFB3B3" />
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
              <Ionicons name="checkmark" size={moderateScale(30)} color="#E9F8FF" />
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
    backgroundColor: colors.backgroundBottom,
  },
  glow: {
    position: 'absolute',
    width: scale(330),
    height: scale(330),
    borderRadius: 999,
    backgroundColor: '#133B78',
    opacity: 0.2,
  },
  glowTop: {
    top: -scale(150),
    left: -scale(60),
  },
  glowBottom: {
    bottom: -scale(180),
    right: -scale(70),
  },
  content: {
    marginHorizontal: scale(18),
    marginTop: verticalScale(10),
    paddingBottom: verticalScale(55),
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
  },
  screenTitle: {
    color: colors.textStrong,
    fontFamily: fontFamily.heavy,
    fontSize: moderateScale(42, 0.35),
    marginBottom: verticalScale(12),
  },
  sectionHeader: {
    marginBottom: verticalScale(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    color: colors.textDim,
    fontFamily: fontFamily.medium,
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
    backgroundColor: 'rgba(24, 38, 62, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(121, 168, 235, 0.26)',
  },
  emptyIconWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(10),
    backgroundColor: 'rgba(62, 141, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(151, 199, 255, 0.4)',
  },
  emptyTitle: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(17, 0.2),
    marginBottom: verticalScale(6),
  },
  emptySub: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    lineHeight: moderateScale(18, 0.2),
    textAlign: 'center',
  },
  completedCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: verticalScale(14),
    backgroundColor: 'rgba(19, 28, 47, 0.8)',
  },
  thumbnail: {
    height: verticalScale(185),
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailFallback: {
    backgroundColor: 'rgba(33, 52, 84, 0.55)',
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
    backgroundColor: 'rgba(62, 141, 255, 0.75)',
  },
  cardMeta: {
    paddingHorizontal: scale(12),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(14),
  },
  cardTitle: {
    color: colors.textStrong,
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
    color: colors.textMuted,
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
    backgroundColor: 'rgba(2, 8, 18, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(18),
  },
  modalCard: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
    backgroundColor: 'rgba(16, 28, 48, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(123, 166, 232, 0.28)',
  },
  modalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(10),
  },
  modalTitle: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(16, 0.2),
    // marginBottom: verticalScale(10),
  },
  modalAction: {
    borderRadius: 12,
    minHeight: verticalScale(44),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: 'rgba(121, 161, 214, 0.24)',
    backgroundColor: 'rgba(55, 72, 101, 0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  modalActionText: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  modalDeleteAction: {
    borderColor: 'rgba(255, 138, 138, 0.35)',
    backgroundColor: 'rgba(83, 26, 37, 0.35)',
  },
  modalDeleteText: {
    color: '#FFB3B3',
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
    borderColor: 'rgba(121, 161, 214, 0.28)',
    backgroundColor: 'rgba(55, 72, 101, 0.35)',
  },
  modalCloseText: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 18, 0.78)',
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
    backgroundColor: 'rgba(12, 24, 42, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(126, 170, 238, 0.32)',
  },
  successIconWrap: {
    width: scale(74),
    height: scale(74),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(39, 173, 117, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(171, 242, 210, 0.56)',
  },
  successTitle: {
    marginTop: verticalScale(12),
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(19, 0.2),
    textAlign: 'center',
  },
  successSubtitle: {
    marginTop: verticalScale(8),
    color: '#D8E6FA',
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.2),
    lineHeight: moderateScale(19, 0.2),
    textAlign: 'center',
  },
  successHint: {
    marginTop: verticalScale(6),
    color: colors.textMuted,
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
    color: '#0A1C33',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(14, 0.2),
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
