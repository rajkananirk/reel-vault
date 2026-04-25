import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_TABS, AppTab } from '../constants/app';
import { fontFamily } from '../fonts/font';
import { colors } from '../theme/colors';
import { moderateScale, scale, verticalScale } from '../utils/responsive';
import { GlassCard } from './GlassCard';

type BottomTabBarProps = {
  activeTab: AppTab;
  onTabPress: (tab: AppTab) => void;
};

const tabIcons: Record<AppTab, React.ComponentProps<typeof Ionicons>['name']> = {
  Home: 'home',
  Downloads: 'download-outline',
  Settings: 'settings-outline',
};

type TabBarItemProps = {
  tab: AppTab;
  isActive: boolean;
  onPress: () => void;
};

const TabBarItem = ({ tab, isActive, onPress }: TabBarItemProps) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 180,
    }).start();
  };

  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
      onPressIn={() => animateScale(0.92)}
      onPressOut={() => animateScale(1)}
    >
      {/* <Animated.View style={{ transform: [{ scale }] }}> */}
        <Ionicons
          name={tabIcons[tab]}
          size={moderateScale(22)}
          color={isActive ? colors.primary : colors.textDim}
          style={styles.tabIcon}
        />
      {/* </Animated.View> */}
        <Text style={[styles.tabLabel, isActive && styles.activeTab]}>{tab}</Text>
    </Pressable>
  );
};

export const BottomTabBar = ({ activeTab, onTabPress }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const mountOpacity = useRef(new Animated.Value(0)).current;
  const mountTranslateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(mountTranslateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mountOpacity, mountTranslateY]);

  return (
  
      <GlassCard style={[styles.tabBar, { bottom: insets.bottom > 0 ? 0 : verticalScale(2) }]}>
      {APP_TABS.map(tab => {
        const isActive = tab === activeTab;

        return (
          <TabBarItem key={tab} tab={tab} isActive={isActive} onPress={() => onTabPress(tab)} />
        );
      })}
      </GlassCard>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: scale(0),
    right: scale(0),
    borderRadius: 0,
    paddingVertical: verticalScale(10),
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgb(9, 18, 35)',
    borderTopColor: 'rgba(122, 155, 204, 0.24)',
    borderTopWidth: 2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    zIndex: 50,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: verticalScale(15),
    minWidth: scale(70),
  },
  tabIcon: {
    marginBottom: verticalScale(3),
  },
  tabLabel: {
    color: colors.textDim,
    fontFamily: fontFamily.medium,
    fontSize: moderateScale(12, 0.2),
  },
  activeTab: {
    color: colors.primary,
  },
});
