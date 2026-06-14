import { ApolloProvider } from '@apollo/client';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, ImageBackground } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen'; // Added import
import { AuthProvider, useAuth } from '@/context/auth';
import { MessagingProvider } from '@/context/messaging';
import { ThemeProvider, useTheme } from '@/context/theme';
import { apolloClient } from '@/lib/apollo';

// Prevent the native splash screen from auto-hiding immediately
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Prevent unhandled promise rejections on fast refreshes */
});

function RootNavigator() {
  const { isAuthenticated, isLoading, hasCompany, hasSubscription } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';

    if (!isAuthenticated) {
      if (!inAuth) router.replace('/(auth)/welcome' as any);
    } else if (!hasCompany) {
      if (!inOnboarding) router.replace('/(onboarding)/company-or-join' as any);
    } else if (!hasSubscription) {
      if (!inOnboarding) router.replace('/(onboarding)/select-plan' as any);
    } else {
      if (!inTabs) router.replace('/(tabs)/home' as any);
    }
    
    // Mark navigation layout as successfully handled
    setNavigationReady(true);
  }, [isAuthenticated, isLoading, hasCompany, hasSubscription, segments, router]);

  // Hide native splash screen only when loading is done AND router has navigated
  const onLayoutRootView = async () => {
    if (!isLoading && navigationReady) {
      await SplashScreen.hideAsync();
    }
  };

  if (isLoading) {
    return (
      <ImageBackground 
        source={require('../assets/images/splash-image.png')} 
        style={styles.splash}
        resizeMode="cover"
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </ImageBackground>
    );
  }

  return (
    <View style={styles.flexContainer} onLayout={onLayoutRootView}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ApolloProvider client={apolloClient}>
            <AuthProvider>
              <MessagingProvider>
                <RootNavigator />
              </MessagingProvider>
            </AuthProvider>
          </ApolloProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexContainer: {
    flex: 1,
  },
});
