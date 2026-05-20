import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { colors } from '../../../common/theme/colors';
import { fontFamily } from '../../../common/fonts/font';
import { moderateScale, scale, verticalScale } from '../../../common/utils/responsive';
import { InstaGradientBackdrop } from '../../../common/widgets/InstaGradientBackdrop';
import { RETURNING_PROGRESS_MS } from '../model/splashModel';
import { useSplashViewModel } from '../viewmodel/useSplashViewModel';

type SplashScreenProps = {
  /** First launch: show CTA. Returning users: brief logo then auto-continue. */
  showOnboarding: boolean;
  onContinue: () => void;
};

export const SplashScreen = ({ showOnboarding, onContinue }: SplashScreenProps) => {
  const { width } = useWindowDimensions();
  const vm = useSplashViewModel();
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(showOnboarding ? 0 : 1)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const progressShine = useRef(new Animated.Value(0)).current;
  const [loadingStatus, setLoadingStatus] = useState('Loading your vault...');
  const [progressComplete, setProgressComplete] = useState(false);

  const logoSize = Math.max(scale(72), width * 0.2);
  const logoImageSize = logoSize * 0.84;
  const progressBarWidth = Math.min(width - scale(72), scale(240));

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, progressBarWidth],
  });

  const shineTranslate = progressShine.interpolate({
    inputRange: [0, 1],
    outputRange: [-progressBarWidth * 0.4, progressBarWidth],
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(heroTranslateY, {
        toValue: 0,
        friction: 9,
        tension: 68,
        useNativeDriver: true,
      }),
    ]).start();

    if (showOnboarding) {
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 520,
        delay: 280,
        useNativeDriver: true,
      }).start();
      return undefined;
    }

    progress.setValue(0);
    setProgressComplete(false);
    setLoadingStatus('Loading your vault...');

    const statusMid = setTimeout(() => setLoadingStatus('Almost ready...'), RETURNING_PROGRESS_MS * 0.55);

    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressShine, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(progressShine, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    shineLoop.start();

    const fillAnim = Animated.timing(progress, {
      toValue: 1,
      duration: RETURNING_PROGRESS_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    fillAnim.start(({ finished }) => {
      shineLoop.stop();
      if (!finished) {
        return;
      }
      setProgressComplete(true);
      setLoadingStatus('Ready');
      setTimeout(() => {
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onContinue());
      }, 220);
    });

    return () => {
      clearTimeout(statusMid);
      shineLoop.stop();
      fillAnim.stop();
    };
  }, [
    footerOpacity,
    heroTranslateY,
    onContinue,
    progress,
    progressShine,
    screenOpacity,
    showOnboarding,
  ]);

  const handleContinue = () => {
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onContinue());
  };

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <InstaGradientBackdrop variant="light" />
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.body, { transform: [{ translateY: heroTranslateY }] }]}>
          {showOnboarding ? (
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={moderateScale(14)} color={colors.primaryStrong} />
              <Text style={styles.trustBadgeText}>{vm.trustBadge}</Text>
            </View>
          ) : null}

          <View style={[styles.logoCard, { width: logoSize, height: logoSize, borderRadius: logoSize * 0.24 }]}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={{ width: logoImageSize, height: logoImageSize }}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.brandName}>{vm.title}</Text>

          {showOnboarding ? (
            <>
              <Text style={styles.headline}>{vm.headline}</Text>
              <Text style={styles.subtitle}>{vm.subtitle}</Text>

              <View style={styles.ratingCard}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Ionicons key={star} name="star" size={moderateScale(14)} color="#FCAF45" />
                  ))}
                </View>
                <View style={styles.ratingMeta}>
                  <Text style={styles.ratingValue}>{vm.ratingLabel}</Text>
                  <Text style={styles.ratingSub}>{vm.ratingSub}</Text>
                </View>
              </View>

              <View style={styles.trustCard}>
                {vm.trustPoints.map(point => (
                  <View key={point.id} style={styles.trustRow}>
                    <View style={styles.trustIconWrap}>
                      <Ionicons name={point.icon} size={moderateScale(15)} color={colors.primaryStrong} />
                    </View>
                    <Text style={styles.trustText}>{point.text}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.platformRow}>
                {vm.platforms.map(platform => (
                  <View key={platform.id} style={[styles.platformDot, { backgroundColor: platform.tint }]}>
                    <Ionicons
                      name={
                        platform.id === 'instagram'
                          ? 'logo-instagram'
                          : platform.id === 'facebook'
                            ? 'logo-facebook'
                            : 'logo-youtube'
                      }
                      size={moderateScale(14)}
                      color="#FFFFFF"
                    />
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.returningWrap}>
              <Text style={styles.returningText}>Welcome back</Text>
              <Text style={styles.returningStatus}>{loadingStatus}</Text>
              <View style={[styles.returningLoader, { width: progressBarWidth }]}>
                <Animated.View style={[styles.returningLoaderFill, { width: progressWidth }]}>
                  <Animated.View
                    style={[
                      styles.returningLoaderShine,
                      { transform: [{ translateX: shineTranslate }] },
                    ]}
                  />
                </Animated.View>
              </View>
              <View style={styles.returningMetaRow}>
                {progressComplete ? (
                  <Ionicons name="checkmark-circle" size={moderateScale(16)} color={colors.success} />
                ) : (
                  <Ionicons name="hourglass-outline" size={moderateScale(14)} color={colors.textDimOnLight} />
                )}
                <Text style={styles.returningMetaText}>
                  {progressComplete ? 'Opening home' : 'Please wait a moment'}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {showOnboarding ? (
          <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
            <Pressable
              style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
              onPress={handleContinue}
            >
              <Text style={styles.ctaText}>{vm.ctaLabel}</Text>
              <Ionicons name="arrow-forward-circle" size={moderateScale(22)} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.lightCanvas,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: scale(22),
    zIndex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: verticalScale(8),
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: 999,
    backgroundColor: 'rgba(225, 48, 108, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.18)',
    marginBottom: verticalScale(18),
  },
  trustBadgeText: {
    color: colors.primaryStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(11, 0.2),
    letterSpacing: 0.3,
  },
  logoCard: {
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  brandName: {
    marginTop: verticalScale(16),
    color: colors.textOnLight,
    fontFamily: fontFamily.heavy,
    fontSize: moderateScale(28, 0.3),
    letterSpacing: 0.5,
  },
  headline: {
    marginTop: verticalScale(14),
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(22, 0.28),
    lineHeight: moderateScale(30, 0.28),
    textAlign: 'center',
  },
  subtitle: {
    marginTop: verticalScale(10),
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.22),
    lineHeight: moderateScale(20, 0.22),
    textAlign: 'center',
    maxWidth: scale(310),
  },
  ratingCard: {
    marginTop: verticalScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: 14,
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: scale(2),
  },
  ratingMeta: {
    gap: verticalScale(2),
  },
  ratingValue: {
    color: colors.textOnLight,
    fontFamily: fontFamily.heavy,
    fontSize: moderateScale(18, 0.2),
  },
  ratingSub: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(11, 0.2),
  },
  trustCard: {
    marginTop: verticalScale(14),
    width: '100%',
    maxWidth: scale(340),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderRadius: 16,
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    gap: verticalScale(10),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  trustIconWrap: {
    width: scale(28),
    height: scale(28),
    borderRadius: 999,
    backgroundColor: 'rgba(225, 48, 108, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustText: {
    flex: 1,
    color: colors.textOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.2),
    lineHeight: moderateScale(18, 0.2),
  },
  platformRow: {
    marginTop: verticalScale(14),
    flexDirection: 'row',
    gap: scale(10),
  },
  platformDot: {
    width: scale(32),
    height: scale(32),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returningWrap: {
    marginTop: verticalScale(20),
    alignItems: 'center',
    gap: verticalScale(10),
    width: '100%',
  },
  returningText: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(16, 0.2),
  },
  returningStatus: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.2),
  },
  returningLoader: {
    height: verticalScale(8),
    borderRadius: 999,
    backgroundColor: colors.lightSurfaceMuted,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    overflow: 'hidden',
    marginTop: verticalScale(4),
  },
  returningLoaderFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primaryStrong,
    overflow: 'hidden',
    minWidth: 0,
  },
  returningLoaderShine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: scale(36),
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 999,
  },
  returningMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: verticalScale(2),
  },
  returningMetaText: {
    color: colors.textDimOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  footer: {
    paddingBottom: verticalScale(16),
    paddingHorizontal: scale(12),
    gap: verticalScale(10),
    width: '100%',
  },
  ctaButton: {
    minHeight: verticalScale(52),
    borderRadius: 14,
    backgroundColor: colors.primaryStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingHorizontal: scale(18),
    shadowColor: '#E1306C',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  ctaButtonPressed: {
    opacity: 0.9,
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(16, 0.2),
  },
  footerNote: {
    textAlign: 'center',
    color: colors.textDimOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(11, 0.2),
    lineHeight: moderateScale(16, 0.2),
  },
});
