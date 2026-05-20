import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontFamily } from '../../../common/fonts/font';
import { colors } from '../../../common/theme/colors';
import { moderateScale, scale, verticalScale } from '../../../common/utils/responsive';
import { GlassCard } from '../../../common/widgets/GlassCard';
import { InstaGradientBackdrop } from '../../../common/widgets/InstaGradientBackdrop';
import { PremiumPlan } from '../../../common/firebase/useUserSubscription';

type SettingsSubscriptionScreenProps = {
  onClose: () => void;
  initialPlan?: PremiumPlan | null;
  isProUser?: boolean;
  error?: string | null;
  onPurchase: (plan: PremiumPlan) => void;
  onCancelPlan: () => void;
  purchaseLoading?: boolean;
};

const planFeatures: Record<PremiumPlan, string[]> = {
  monthly: [
    'No Ads',
    '1080p Quality Downloads',
    'Fast Link Extraction',
    'Cloud Storage',
    'Download History Sync (All Devices)',
  ],
  yearly: [
    'No Ads',
    '4K Quality Downloads',
    'Instant Link Extraction',
    'Priority Processing',
    'Cloud Storage',
    'Download History Sync (All Devices)',
  ],
};

export const SettingsSubscriptionScreen = ({
  onClose,
  initialPlan,
  isProUser,
  error,
  onPurchase,
  onCancelPlan,
  purchaseLoading,
}: SettingsSubscriptionScreenProps) => {
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan>(initialPlan ?? 'yearly');
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(20)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;
  const selectedFeatures = planFeatures[selectedPlan];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1.03,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [ctaPulse, screenOpacity, screenTranslateY]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <InstaGradientBackdrop variant="light" />

      <Animated.View style={{ flex: 1, zIndex: 1, opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={moderateScale(20)} color={colors.textOnLight} />
            </TouchableOpacity>
            {/* <Text style={styles.headerTitle}>ReelVault</Text> */}
            <View style={styles.helpWrap}>
              <Ionicons name="help-circle-outline" size={moderateScale(18)} color={colors.textMutedOnLight} />
            </View>
          </View>

            <View style={styles.heroIconWrap}>
              <Image source={require('../../../assets/images/logo.png')} style={styles.heroImage} />
            </View>

          <Text style={styles.title}>Get ReelVault Pro</Text> 
          <Text style={styles.subtitle}>
            {selectedPlan === 'yearly'
              ? 'Unlimited high-speed downloads, bigger storage, and full history sync across devices.'
              : 'Premium access with cloud storage and download history sync on any device.'}
          </Text>

          {isProUser ? (
            <GlassCard style={styles.activePlanCard}>
              <View style={styles.activePlanRow}>
                <View style={styles.activePlanBadge}>
                  <Ionicons name="sparkles" size={moderateScale(13)} color={colors.primaryStrong} />
                  <Text style={styles.activePlanBadgeText}>Pro Active</Text>
                </View>
                <Text style={styles.activePlanText}>
                  Current plan: {initialPlan ? initialPlan[0].toUpperCase() + initialPlan.slice(1) : 'Pro'}
                </Text>
              </View>
            </GlassCard>
          ) : null}

          <View style={styles.planWrap}>
            <Pressable
              style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <View>
                <Text style={styles.planTitle}>Monthly</Text>
                <Text style={styles.planSub}>100GB storage + history sync</Text>
              </View>
              <View style={styles.planPriceWrap}>
                <Text style={styles.planPrice}>₹99</Text>
                <Text style={styles.planSub}>per month</Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardActive]}
              onPress={() => setSelectedPlan('yearly')}
            >
              <View>
                <View style={styles.yearlyHeaderRow}>
                  <View style={styles.bestValueChip}>
                    <Text style={styles.bestValueText}>Save 33%</Text>
                  </View>
                </View>
                <View style={styles.yearlyTitleWrap}>
                  <Text style={styles.planTitle}>Yearly</Text>
                  <Ionicons name="checkmark-circle" size={moderateScale(14)} color={colors.primary} />
                </View>
                <Text style={styles.planSub}>250GB storage + priority sync</Text>
              </View>
              <View style={styles.planPriceWrap}>
                <Text style={styles.planPrice}>₹799</Text>
                <Text style={styles.planSub}>per year</Text>
              </View>
            </Pressable>
          </View>

          <GlassCard style={styles.featuresCard}>
            {selectedFeatures.map(item => (
              <View key={item} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name="checkmark" size={moderateScale(12)} color={colors.primaryStrong} />
                </View>
                <Text style={styles.featureText}>{item}</Text>
              </View>
            ))}
          </GlassCard>

          <Animated.View style={{ transform: [{ scale: ctaPulse }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.ctaButton}
              onPress={() => onPurchase(selectedPlan)}
              disabled={purchaseLoading}
            >
              <Text style={styles.ctaText}>
                {purchaseLoading
                  ? 'Activating...'
                  : isProUser
                    ? selectedPlan === 'yearly'
                      ? 'Switch to Yearly Plan'
                      : 'Switch to Monthly Plan'
                    : selectedPlan === 'yearly'
                      ? 'Start Your Pro Journey'
                      : 'Continue with Monthly'}
              </Text>
              <Ionicons name="arrow-forward" size={moderateScale(18)} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          {isProUser ? (
            <TouchableOpacity activeOpacity={0.85} style={styles.cancelPlanButton} onPress={onCancelPlan} disabled={purchaseLoading}>
              <Text style={styles.cancelPlanText}>{purchaseLoading ? 'Please wait...' : 'Cancel Current Plan'}</Text>
            </TouchableOpacity>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.footerText}>Cancel anytime. Secure checkout.</Text>
          <View style={styles.legalRow}>
            <Text style={styles.legalText}>Restore Purchase</Text>
            <Text style={styles.legalDivider}>|</Text>
            <Text style={styles.legalText}>Terms of Service</Text>
          </View>
          <Text style={styles.copyrightText}>© 2026 ReelVault. All rights reserved.</Text>
        </ScrollView>
      </Animated.View>
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
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(38),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  closeButton: {
    width: scale(28),
    height: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 99,
    backgroundColor: colors.lightSurfaceMuted,
  },
  headerTitle: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(20, 0.3),
  },
  helpWrap: {
    width: scale(28),
    alignItems: 'center',
  },
  heroCard: {
    borderRadius: 26,
    marginBottom: verticalScale(18),
    backgroundColor: colors.lightSurface,
    borderColor: colors.lightBorder,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroImage: {
    width: scale(100),
    height: scale(100),
    borderRadius: 28,
  },
  heroIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textOnLight,
    fontFamily: fontFamily.heavy,
    fontSize: moderateScale(33, 0.28),
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(14, 0.2),
    textAlign: 'center',
    marginTop: verticalScale(4),
    marginBottom: verticalScale(16),
    lineHeight: moderateScale(20, 0.2),
  },
  planWrap: {
    gap: verticalScale(10),
  },
  planCard: {
    borderRadius: 18,
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(13),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  planCardActive: {
    borderColor: colors.primaryStrong,
    shadowColor: colors.primaryStrong,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  yearlyHeaderRow: {
    flexDirection: 'row',
    marginBottom: verticalScale(4),
  },
  bestValueChip: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: 999,
    backgroundColor: colors.primaryStrong,
    borderWidth: 0,
  },
  bestValueText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(11, 0.2),
    letterSpacing: 0.2,
  },
  yearlyTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
  },
  planTitle: {
    color: colors.textOnLight,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(20, 0.2),
  },
  planSub: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(13, 0.2),
  },
  planPriceWrap: {
    alignItems: 'flex-end',
  },
  planPrice: {
    color: colors.textOnLight,
    fontFamily: fontFamily.heavy,
    fontSize: moderateScale(30, 0.2),
  },
  featuresCard: {
    marginTop: verticalScale(14),
    borderRadius: 18,
    backgroundColor: colors.lightSurface,
    borderWidth: 1,
    borderColor: colors.lightBorder,
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: verticalScale(7),
  },
  featureIconWrap: {
    width: scale(20),
    height: scale(20),
    borderRadius: 99,
    backgroundColor: 'rgba(225, 48, 108, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: colors.textOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(14, 0.2),
  },
  ctaButton: {
    marginTop: verticalScale(20),
    borderRadius: 999,
    backgroundColor: colors.primaryStrong,
    minHeight: verticalScale(52),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: scale(8),
    shadowColor: '#E1306C',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(18, 0.2),
  },
  activePlanCard: {
    marginBottom: verticalScale(12),
    borderRadius: 14,
    backgroundColor: 'rgba(225, 48, 108, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.22)',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
  },
  activePlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(8),
  },
  activePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: 999,
    backgroundColor: 'rgba(225, 48, 108, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.28)',
  },
  activePlanBadgeText: {
    color: colors.primaryStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(11, 0.2),
  },
  activePlanText: {
    flex: 1,
    textAlign: 'right',
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  cancelPlanButton: {
    marginTop: verticalScale(10),
    borderRadius: 999,
    minHeight: verticalScale(44),
    borderWidth: 1,
    borderColor: 'rgba(225, 48, 108, 0.35)',
    backgroundColor: colors.lightSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelPlanText: {
    color: colors.primaryStrong,
    fontFamily: fontFamily.bold,
    fontSize: moderateScale(14, 0.2),
  },
  errorText: {
    marginTop: verticalScale(8),
    color: colors.primaryStrong,
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  footerText: {
    marginTop: verticalScale(10),
    textAlign: 'center',
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  legalRow: {
    marginTop: verticalScale(28),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
  },
  legalText: {
    color: colors.textMutedOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  legalDivider: {
    color: colors.textDimOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  copyrightText: {
    marginTop: verticalScale(8),
    textAlign: 'center',
    color: colors.textDimOnLight,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(11, 0.2),
  },
});
