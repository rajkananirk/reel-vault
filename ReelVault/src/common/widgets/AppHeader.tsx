import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { fontFamily } from '../fonts/font';
import { colors } from '../theme/colors';
import { moderateScale, scale, verticalScale } from '../utils/responsive';

type AppHeaderProps = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Centered wordmark + small app logo (Home) */
  showLogo?: boolean;
  /** Light screens (Settings) use dark text; dark screens use light text */
  tone?: 'light' | 'dark';
};

export const AppHeader = ({ title, showBack, onBack, right, showLogo, tone = 'dark' }: AppHeaderProps) => {
  const titleColor = tone === 'light' ? colors.textOnLight : colors.textStrong;
  const logoTitleColor = tone === 'light' ? colors.textOnLight : colors.textStrong;
  const backColor = tone === 'light' ? colors.textOnLight : colors.primaryStrong;

  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity activeOpacity={0.8} onPress={onBack} style={styles.sideSlot}>
          <Ionicons name="arrow-back" size={moderateScale(21)} color={backColor} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideSlot} />
      )}

      <View style={styles.titleWrap}>
        {showLogo ? (
          <View style={styles.brandRow}>
            <Image source={require('../../assets/images/logo.png')} style={styles.brandLogo} resizeMode="contain" />
            <Text numberOfLines={1} style={[styles.headerTitleWithLogo, { color: logoTitleColor }]}>
              {title}
            </Text>
          </View>
        ) : (
          <Text numberOfLines={1} style={[styles.headerTitle, { color: titleColor }]}>
            {title}
          </Text>
        )}
      </View>

      <View style={styles.sideSlot}>{right ?? <View />}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(18),
    zIndex: 2,
  },
  sideSlot: {
    minWidth: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(4),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    maxWidth: '100%',
  },
  brandLogo: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
  },
  headerTitle: {
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    letterSpacing: 0.2,
    fontWeight: '400',
    fontSize: moderateScale(24, 0.3),
  },
  headerTitleWithLogo: {
    flexShrink: 1,
    textAlign: 'left',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(22, 0.3),
    letterSpacing: 0.2,
  },
});
