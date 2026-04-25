import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppTab } from '../common/constants/app';
import { useFirebaseAuth } from '../common/firebase/useFirebaseAuth';
import { useUserSubscription } from '../common/firebase/useUserSubscription';
import { BottomTabBar } from '../common/widgets/BottomTabBar';
import { ExtractResultScreen } from '../modules/home/view/ExtractResultScreen';
import { HomeScreen } from '../modules/home/view/HomeScreen';
import { DownloadsScreen } from '../modules/downloads/view/DownloadsScreen';
import { SettingsEditProfileScreen } from '../modules/settings/view/SettingsEditProfileScreen';
import { SettingsLoginScreen } from '../modules/settings/view/SettingsLoginScreen';
import { SettingsScreen } from '../modules/settings/view/SettingsScreen';
import { SettingsSignupScreen } from '../modules/settings/view/SettingsSignupScreen';
import { SettingsSubscriptionScreen } from '../modules/settings/view/SettingsSubscriptionScreen';
import { SplashScreen } from '../modules/splash/view/SplashScreen';

const SPLASH_DURATION_MS = 1800;
type RootStackParamList = {
  MainTabs: undefined;
  ExtractResult: {
    sourceUrl: string;
    title: string;
    videoUrl: string;
    platformName: string;
    thumbnailUrl?: string | null;
  };
  SettingsLogin: undefined;
  SettingsSignup: undefined;
  SettingsSubscription: undefined;
  SettingsEditProfile: undefined;
};
const Stack = createNativeStackNavigator<RootStackParamList>();

const MainTabsRoute = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'MainTabs'>) => {
  const [activeTab, setActiveTab] = useState<AppTab>('Home');

  let screenContent: React.ReactNode = null;
  if (activeTab === 'Home') {
    screenContent = (
      <HomeScreen
        onTabPress={setActiveTab}
        onOpenExtractResult={payload => navigation.push('ExtractResult', payload)}
      />
    );
  } else if (activeTab === 'Downloads') {
    screenContent = <DownloadsScreen />;
  } else {
    screenContent = (
      <SettingsScreen
        onOpenAuth={mode => navigation.push(mode === 'signup' ? 'SettingsSignup' : 'SettingsLogin')}
        onOpenSubscription={() => navigation.push('SettingsSubscription')}
        onOpenProfileEdit={() => navigation.push('SettingsEditProfile')}
      />
    );
  }

  return (
    <>
      {screenContent}
      <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </>
  );
};

const SettingsLoginRoute = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'SettingsLogin'>) => {
  const authVm = useFirebaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    authVm.clearError();
  }, []);

  useEffect(() => {
    if (authVm.user) {
      navigation.goBack();
    }
  }, [authVm.user, navigation]);

  return (
    <SettingsLoginScreen
      email={email}
      password={password}
      submitting={authVm.submitting}
      error={authVm.error}
      onBack={() => navigation.goBack()}
      onOpenSignup={() => navigation.replace('SettingsSignup')}
      onEmailChange={text => {
        setEmail(text);
        authVm.clearError();
      }}
      onPasswordChange={text => {
        setPassword(text);
        authVm.clearError();
      }}
      onSubmit={() => authVm.signIn(email, password)}
    />
  );
};

const SettingsSignupRoute = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'SettingsSignup'>) => {
  const authVm = useFirebaseAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    authVm.clearError();
  }, []);

  useEffect(() => {
    if (authVm.user) {
      navigation.goBack();
    }
  }, [authVm.user, navigation]);

  return (
    <SettingsSignupScreen
      fullName={fullName}
      email={email}
      password={password}
      submitting={authVm.submitting}
      error={authVm.error}
      onBack={() => navigation.goBack()}
      onOpenLogin={() => navigation.replace('SettingsLogin')}
      onFullNameChange={text => {
        setFullName(text);
        authVm.clearError();
      }}
      onEmailChange={text => {
        setEmail(text);
        authVm.clearError();
      }}
      onPasswordChange={text => {
        setPassword(text);
        authVm.clearError();
      }}
      onSubmit={() => authVm.signUp(email, password, fullName)}
    />
  );
};

const SettingsSubscriptionRoute = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'SettingsSubscription'>) => {
  const authVm = useFirebaseAuth();
  const subscriptionVm = useUserSubscription(authVm.user?.uid);

  useEffect(() => {
    if (!authVm.loading && !authVm.user) {
      navigation.replace('SettingsLogin');
    }
  }, [authVm.loading, authVm.user, navigation]);

  return (
    <SettingsSubscriptionScreen
      onClose={() => navigation.goBack()}
      initialPlan={subscriptionVm.plan}
      isProUser={subscriptionVm.isPro}
      error={subscriptionVm.error}
      purchaseLoading={subscriptionVm.submitting}
      onPurchase={plan => {
        if (!authVm.user?.uid) {
          navigation.replace('SettingsLogin');
          return;
        }
        subscriptionVm.activatePlan(authVm.user.uid, plan);
      }}
      onCancelPlan={() => {
        if (!authVm.user?.uid) {
          return;
        }
        subscriptionVm.cancelPlan(authVm.user.uid);
      }}
    />
  );
};

const SettingsEditProfileRoute = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'SettingsEditProfile'>) => {
  const authVm = useFirebaseAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (authVm.user) {
      setFullName(authVm.user.displayName ?? '');
      setEmail(authVm.user.email ?? '');
      return;
    }
    if (!authVm.loading) {
      navigation.replace('SettingsLogin');
    }
  }, [authVm.user, authVm.loading, navigation]);

  return (
    <SettingsEditProfileScreen
      fullName={fullName}
      email={email}
      submitting={authVm.submitting}
      error={authVm.error}
      onBack={() => navigation.goBack()}
      onFullNameChange={text => {
        setFullName(text);
        authVm.clearError();
      }}
      onEmailChange={text => {
        setEmail(text);
        authVm.clearError();
      }}
      onSubmit={async () => {
        const success = await authVm.updateUserProfile(fullName, email);
        if (success) {
          navigation.goBack();
        }
      }}
    />
  );
};

const ExtractResultRoute = ({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ExtractResult'>) => {
  return (
    <ExtractResultScreen
      sourceUrl={route.params.sourceUrl}
      title={route.params.title}
      videoUrl={route.params.videoUrl}
      platformName={route.params.platformName}
      thumbnailUrl={route.params.thumbnailUrl}
      onBack={() => navigation.goBack()}
    />
  );
};

const AppRoot = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right',
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabsRoute} />
        <Stack.Screen name="ExtractResult" component={ExtractResultRoute} />
        <Stack.Screen name="SettingsLogin" component={SettingsLoginRoute} />
        <Stack.Screen name="SettingsSignup" component={SettingsSignupRoute} />
        <Stack.Screen name="SettingsSubscription" component={SettingsSubscriptionRoute} />
        <Stack.Screen name="SettingsEditProfile" component={SettingsEditProfileRoute} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppRoot;
