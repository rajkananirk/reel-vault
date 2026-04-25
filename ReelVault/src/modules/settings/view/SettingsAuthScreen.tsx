import React from 'react';
import { StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontFamily } from '../../../common/fonts/font';
import { colors } from '../../../common/theme/colors';
import { moderateScale, scale, verticalScale } from '../../../common/utils/responsive';
import { GlassCard } from '../../../common/widgets/GlassCard';

type AuthMode = 'login' | 'signup';

type SettingsAuthScreenProps = {
  fullName: string;
  email: string;
  password: string;
  mode: AuthMode;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onModeChange: (mode: AuthMode) => void;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export const SettingsAuthScreen = ({
  fullName,
  email,
  password,
  mode,
  submitting,
  error,
  onBack,
  onModeChange,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: SettingsAuthScreenProps) => {
  const isLogin = mode === 'login';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.8} onPress={onBack} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={moderateScale(21)} color={colors.primaryStrong} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account</Text>
          <View style={styles.backIcon} />
        </View>

        <GlassCard style={styles.groupCard}>
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, isLogin && styles.modeTabActive]}
              activeOpacity={0.85}
              onPress={() => onModeChange('login')}
            >
              <Text style={[styles.modeTabText, isLogin && styles.modeTabTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, !isLogin && styles.modeTabActive]}
              activeOpacity={0.85}
              onPress={() => onModeChange('signup')}
            >
              <Text style={[styles.modeTabText, !isLogin && styles.modeTabTextActive]}>Signup</Text>
            </TouchableOpacity>
          </View>

          {!isLogin ? (
            <TextInput
              value={fullName}
              onChangeText={onFullNameChange}
              placeholder="Full Name"
              autoCapitalize="words"
              placeholderTextColor={colors.textDim}
              style={styles.authInput}
            />
          ) : null}

          <TextInput
            value={email}
            onChangeText={onEmailChange}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textDim}
            style={styles.authInput}
          />
          <TextInput
            value={password}
            onChangeText={onPasswordChange}
            placeholder="Password"
            secureTextEntry
            placeholderTextColor={colors.textDim}
            style={styles.authInput}
          />

          {error ? <Text style={styles.authError}>{error}</Text> : null}

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.submitButton}
            disabled={submitting}
            onPress={onSubmit}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Please wait...' : isLogin ? 'Login' : 'Create account'}
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundBottom,
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(8),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(14),
  },
  backIcon: {
    width: scale(34),
  },
  headerTitle: {
    color: colors.textStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(24, 0.3),
  },
  groupCard: {
    borderRadius: 16,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    backgroundColor: 'rgba(24, 36, 58, 0.72)',
  },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: scale(4),
    backgroundColor: 'rgba(18, 28, 45, 0.95)',
    marginBottom: verticalScale(12),
    gap: scale(4),
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: verticalScale(8),
    borderRadius: 999,
  },
  modeTabActive: {
    backgroundColor: colors.primaryStrong,
  },
  modeTabText: {
    color: colors.textDim,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
  modeTabTextActive: {
    color: '#F4F8FF',
  },
  authInput: {
    backgroundColor: 'rgba(18, 30, 50, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(117, 154, 204, 0.2)',
    borderRadius: 12,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(11),
    color: colors.textStrong,
    fontFamily: fontFamily.medium,
    marginBottom: verticalScale(9),
  },
  authError: {
    color: '#FF8A8A',
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
    marginBottom: verticalScale(8),
  },
  submitButton: {
    marginTop: verticalScale(6),
    borderRadius: 12,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryStrong,
  },
  submitButtonText: {
    color: '#F6FAFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(13, 0.2),
  },
});
