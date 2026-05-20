import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fontFamily } from '../fonts/font';
import { colors } from '../theme/colors';
import { moderateScale, scale } from '../utils/responsive';

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  tone?: 'light' | 'dark';
};

export const SectionHeader = ({ title, actionLabel, tone = 'light' }: SectionHeaderProps) => (
  <View style={styles.container}>
    <Text style={[styles.title, tone === 'light' && styles.titleLight]}>{title}</Text>
    {actionLabel ? (
      <TouchableOpacity activeOpacity={0.8}>
        <Text style={styles.action}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  title: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(18, 0.35),
  },
  titleLight: {
    color: colors.textOnLight,
  },
  action: {
    color: colors.primary,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.25),
  },
});
