import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../../../common/theme/colors';
import { fontFamily } from '../../../common/fonts/font';
import { moderateScale, scale, verticalScale } from '../../../common/utils/responsive';
import { useSplashViewModel } from '../viewmodel/useSplashViewModel';

export const SplashScreen = () => {
  const { width } = useWindowDimensions();
  const vm = useSplashViewModel();
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const logoGlow = useRef(new Animated.Value(0.8)).current;

  const logoSize = Math.max(scale(72), width * 0.2);
  const logoImageSize = logoSize * 0.82;
  const progressWidth = Math.min(width * 0.22, scale(108));
  const progressFillWidth = progressWidth * vm.progress;

  useEffect(() => {
    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.03,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 0.95,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoGlow, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(logoGlow, {
            toValue: 0.75,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [logoGlow, logoScale]);

  return (
    <View style={styles.gradient}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.logoCard,
              {
                width: logoSize,
                height: logoSize,
                borderRadius: logoSize * 0.27,
                transform: [{ scale: logoScale }],
                opacity: logoGlow,
              },
            ]}
          >
            <Image
              source={require('../../../assets/images/logo.png')}
              style={{ width: logoImageSize, height: logoImageSize }}
              resizeMode="contain"
            />
          </Animated.View>

          <Text style={styles.title}>{vm.title}</Text>

          <View style={[styles.progressTrack, { width: progressWidth }]}>
            <View style={[styles.progressFill, { width: progressFillWidth }]} />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.subtitle}>{vm.subtitle}</Text>
          <View style={styles.loaderRing}>
            <View style={styles.loaderDot} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: colors.backgroundBottom,
  },
  glow: {
    position: 'absolute',
    width: scale(340),
    height: scale(340),
    borderRadius: 999,
    backgroundColor: '#0D2D61',
    opacity: 0.28,
  },
  glowTop: {
    top: -scale(120),
    left: -scale(70),
  },
  glowBottom: {
    bottom: -scale(150),
    right: -scale(70),
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: scale(24),
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: verticalScale(16),
  },
  logoCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  title: {
    color: colors.textStrong,
    fontSize: moderateScale(42, 0.35),
    letterSpacing: 0.6,
    fontFamily: fontFamily.heavy,
    fontStyle: 'italic',
    marginTop: verticalScale(8),
  },
  progressTrack: {
    height: verticalScale(6),
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    marginTop: verticalScale(4),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: verticalScale(42),
    gap: verticalScale(20),
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.25),
    letterSpacing: 3.2,
  },
  loaderRing: {
    width: scale(32),
    height: scale(32),
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
});
