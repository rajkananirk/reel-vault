import React from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';
import { StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontFamily } from '../../../common/fonts/font';
import { colors } from '../../../common/theme/colors';
import { moderateScale, scale, verticalScale } from '../../../common/utils/responsive';
import { AppHeader } from '../../../common/widgets/AppHeader';
import { GlassCard } from '../../../common/widgets/GlassCard';
import { InstaGradientBackdrop } from '../../../common/widgets/InstaGradientBackdrop';

type SettingsEditProfileScreenProps = {
  fullName: string;
  email: string;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
};

export const SettingsEditProfileScreen = ({
  fullName,
  email,
  submitting,
  error,
  onBack,
  onFullNameChange,
  onEmailChange,
  onSubmit,
}: SettingsEditProfileScreenProps) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <InstaGradientBackdrop variant="light" />
      <View style={styles.content}>
        <AppHeader title="Edit Profile" tone="light" showBack onBack={onBack} />
        <GlassCard style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="sparkles" size={moderateScale(16)} color={colors.primaryStrong} />
          </View>
          <Text style={styles.heroTitle}>Polish Your Profile</Text>
          <Text style={styles.heroSubtitle}>
            Keep your details updated for a seamless premium experience across devices.
          </Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={onFullNameChange}
              placeholder="Enter your full name"
              autoCapitalize="words"
              placeholderTextColor={colors.textDimOnLight}
              style={styles.input}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={onEmailChange}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.textDimOnLight}
              style={styles.input}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.helpText}>If email is changed, Firebase may send a verification email.</Text>

          <TouchableOpacity activeOpacity={0.9} style={styles.button} disabled={submitting} onPress={onSubmit}>
            <Ionicons name="checkmark-circle" size={moderateScale(17)} color="#F6FAFF" />
            <Text style={styles.buttonText}>{submitting ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
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
  heroCard: {
    borderRadius: 18,
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(14),
    marginBottom: verticalScale(12),
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroIconWrap: {
    width: scale(32),
    height: scale(32),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(225, 48, 108, 0.1)',
    borderWidth: 1,
    borderColor: colors.lightBorder,
    marginBottom: verticalScale(10),
  },
  heroTitle: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(20, 0.2),
    marginBottom: verticalScale(4),
  },
  heroSubtitle: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    lineHeight: moderateScale(18, 0.2),
  },
  card: {
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
  fieldBlock: {
    marginBottom: verticalScale(8),
  },
  fieldLabel: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(12, 0.2),
    marginBottom: verticalScale(6),
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.inputSurfaceLight,
    borderWidth: 1,
    borderColor: colors.lightBorderStrong,
    borderRadius: 12,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(11),
    color: colors.textOnLight,
    fontFamily: fontFamily.medium,
  },
  error: {
    color: '#FF8A8A',
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    marginBottom: verticalScale(8),
  },
  helpText: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    lineHeight: moderateScale(17, 0.2),
    marginBottom: verticalScale(12),
  },
  button: {
    borderRadius: 14,
    minHeight: verticalScale(46),
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: scale(7),
    backgroundColor: colors.primaryStrong,
    shadowColor: '#E1306C',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  buttonText: {
    color: '#F6FAFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(14, 0.2),
  },
});
