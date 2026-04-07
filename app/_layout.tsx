import { useQuery, ApolloProvider } from '@apollo/client';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/auth';
import { ThemeProvider, useTheme } from '../context/theme';
import { apolloClient, onGraphQLError } from '../lib/apollo';
import { AUTH_CONTEXT_QUERY } from '../graphql/queries';
import { useTokenRefresh } from '../hooks/useTokenRefresh';

function RootNavigator() {
  const { isAuthenticated, isLoading, hasCompany, signOut, setRoleContext } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  /** Keep JWT token fresh (Section 21) */
  useTokenRefresh();

  /**
   * Fetch authContext + companiesContext immediately after the user is authenticated.
   * This populates role flags and company permissions used throughout the app.
   */
  const { data: authCtxData } = useQuery(AUTH_CONTEXT_QUERY, {
    skip: !isAuthenticated,
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (authCtxData?.authContext && authCtxData?.companiesContext) {
      try {
        const roleCtx = typeof authCtxData.authContext === 'string'
          ? JSON.parse(authCtxData.authContext)
          : authCtxData.authContext;
        const companiesCtx = typeof authCtxData.companiesContext === 'string'
          ? JSON.parse(authCtxData.companiesContext)
          : authCtxData.companiesContext;
        setRoleContext(roleCtx, companiesCtx);
      } catch {
        // Parsing failed — not critical, app continues without role context
      }
    }
  }, [authCtxData, setRoleContext]);

  /**
   * Global GraphQL error handling (Section 21).
   */
  useEffect(() => {
    const unsubscribe = onGraphQLError((code) => {
      switch (code) {
        case 'UNAUTHENTICATED':
          signOut();
          break;
        case 'NO_SUBSCRIPTION':
        case 'SUBSCRIPTION_INACTIVE':
        case 'SUBSCRIPTION_PAST_DUE':
        case 'COMPANY_REQUIRED':
          // Let individual screens handle these; don't force a global redirect
          break;
      }
    });
    return unsubscribe;
  }, [signOut]);

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';

    if (!isAuthenticated) {
      if (!inAuth) router.replace('/(auth)/welcome' as any);
    } else if (!hasCompany) {
      if (!inOnboarding) router.replace('/(onboarding)/create-company' as any);
    } else {
      if (!inTabs) router.replace('/(tabs)/home' as any);
    }
  }, [isAuthenticated, isLoading, hasCompany, segments, router]);

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
              <RootNavigator />
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
