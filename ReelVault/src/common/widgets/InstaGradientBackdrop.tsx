import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '../theme/colors';

type InstaGradientBackdropProps = {
  /** `light` = soft pastel on off-white (Settings / modals). `dark` = current home look. */
  variant?: 'light' | 'dark';
};

/**
 * Soft Instagram-style gradient ambiance (no extra native deps).
 * Place inside a parent with `position: 'relative'` and `overflow: 'hidden'`.
 */
export const InstaGradientBackdrop = ({ variant = 'dark' }: InstaGradientBackdropProps) => {
  const { width, height } = useWindowDimensions();
  const max = Math.max(width, height);
  const large = max * 0.62;
  const mid = max * 0.48;
  const small = max * 0.38;

  if (variant === 'light') {
    return (
      <View style={styles.wrap} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.lightCanvas }]} />
        <View
          style={[
            styles.orb,
            { width: large, height: large, backgroundColor: colors.lightOrbPurple, top: -large * 0.42, right: -large * 0.22 },
          ]}
        />
        <View
          style={[
            styles.orb,
            { width: mid, height: mid, backgroundColor: colors.lightOrbPink, bottom: -mid * 0.48, left: -mid * 0.32 },
          ]}
        />
        <View
          style={[
            styles.orb,
            { width: small, height: small, backgroundColor: colors.lightOrbYellow, top: height * 0.26, left: -small * 0.28 },
          ]}
        />
        <View
          style={[
            styles.orb,
            { width: mid * 0.85, height: mid * 0.85, backgroundColor: colors.lightOrbOrange, bottom: height * 0.1, right: -mid * 0.18 },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.backgroundBottom }]} />
      <View style={[styles.orb, { width: large, height: large, backgroundColor: colors.glowPurple, top: -large * 0.42, right: -large * 0.22 }]} />
      <View style={[styles.orb, { width: mid, height: mid, backgroundColor: colors.glowPink, bottom: -mid * 0.48, left: -mid * 0.32 }]} />
      <View style={[styles.orb, { width: small, height: small, backgroundColor: colors.glowOrange, top: height * 0.28, left: -small * 0.28 }]} />
      <View style={[styles.orb, { width: mid * 0.85, height: mid * 0.85, backgroundColor: colors.glowMagenta, bottom: height * 0.12, right: -mid * 0.2 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
});
