import { useApolloClient } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';
import { REFRESH_TOKEN_KEY, TOKEN_KEY } from '../constants/api';
import { REFRESH_TOKEN_MUTATION } from '../graphql/mutations';
import { useAuth } from '../context/auth';

const REFRESH_INTERVAL_MS = 4.5 * 60 * 1000; // 4 min 30 sec

/**
 * Automatically refreshes the JWT token every ~4 min 30 sec while the user
 * is authenticated, per Section 21 of the API guide.
 */
export function useTokenRefresh() {
  const { isAuthenticated, signOut } = useAuth();
  const client = useApolloClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    async function refresh() {
      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) return;

        const { data } = await client.mutate({
          mutation: REFRESH_TOKEN_MUTATION,
          variables: { refreshToken },
        });

        const result = data?.refreshToken;
        if (result?.success && result?.token) {
          await AsyncStorage.setItem(TOKEN_KEY, result.token);
          if (result.refreshToken) {
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
          }
        } else {
          // Token refresh failed — sign out
          await signOut();
        }
      } catch {
        // Network error during refresh — don't sign out, will retry next interval
      }
    }

    // Refresh immediately on mount to ensure token is fresh
    refresh();

    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, client, signOut]);
}
