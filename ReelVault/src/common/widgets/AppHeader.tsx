import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { fontFamily } from '../fonts/font';
import { colors } from '../theme/colors';
import { moderateScale, scale, verticalScale } from '../utils/responsive';

type AppHeaderProps = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
};

export const AppHeader = ({ title, showBack, onBack, right }: AppHeaderProps) => {
  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity activeOpacity={0.8} onPress={onBack} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={moderateScale(21)} color={colors.primaryStrong} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backIcon} />
      )}

      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>

      <View style={styles.rightWrap}>{right ?? <View style={styles.backIcon} />}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(18),
  },
  backIcon: {
    width: scale(34),
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(24, 0.3),
  },
  rightWrap: {
    minWidth: scale(34),
    alignItems: 'flex-end',
  },
});
