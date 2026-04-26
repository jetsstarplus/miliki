import { ApolloProvider } from '@apollo/client';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/auth';
import { MessagingProvider } from '../context/messaging';
import { ThemeProvider, useTheme } from '../context/theme';
import { apolloClient } from '../lib/apollo';

function RootNavigator() {
  const { isAuthenticated, isLoading, hasCompany, hasSubscription } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();

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
  }, [isAuthenticated, isLoading, hasCompany, hasSubscription, segments, router]);

  if (isLoading) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
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
});
