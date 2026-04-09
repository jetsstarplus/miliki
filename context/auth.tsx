import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ACTIVE_COMPANY_KEY, API_URL, LAST_REFRESH_KEY, REFRESH_TOKEN_KEY, TOKEN_KEY } from '../constants/api';
import { apolloClient } from '../lib/apollo';

export interface UserNode {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  verified: boolean;
}

export interface Company {
  id: string;
  name: string;
  companyType: 'LANDLORD' | 'AGENT';
  status: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserNode | null;
  activeCompany: Company | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompany: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (token: string, refreshToken: string, user: UserNode) => Promise<void>;
  signOut: () => Promise<void>;
  setActiveCompany: (company: Company) => Promise<void>;
  updateUser: (user: UserNode) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── How stale a token must be before we attempt a refresh ────────────────────
const SIX_HOURS = 6 * 60 * 60 * 1000;

// ── Raw HTTP refresh — bypasses Apollo middleware to avoid circular deps ─────
async function rawRefresh(
  refreshToken: string,
): Promise<{ token: string; refreshToken: string } | null> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation RefreshToken($refreshToken: String!) {
            refreshToken(input: { refreshToken: $refreshToken }) {
              success token refreshToken
            }
          }
        `,
        variables: { refreshToken },
      }),
    });
    const json = await res.json();
    const data = json?.data?.refreshToken;
    if (data?.success && data?.token) {
      return {
        token: data.token as string,
        refreshToken: (data.refreshToken as string) ?? refreshToken,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Clear all auth storage ───────────────────────────────────────────────────
async function clearAuthStorage() {
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(ACTIVE_COMPANY_KEY),
    AsyncStorage.removeItem(LAST_REFRESH_KEY),
  ]);
}

const SIGNED_OUT_STATE: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  activeCompany: null,
  isLoading: false,
  isAuthenticated: false,
  hasCompany: false,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ...SIGNED_OUT_STATE,
    isLoading: true,
  });

  // Keep a ref so AppState handler never has a stale closure
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [token, storedRefresh, companyJson, lastRefreshStr] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(REFRESH_TOKEN_KEY),
          AsyncStorage.getItem(ACTIVE_COMPANY_KEY),
          AsyncStorage.getItem(LAST_REFRESH_KEY),
        ]);

        if (!token) {
          setState(s => ({ ...s, isLoading: false }));
          return;
        }

        const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : 0;
        const needsRefresh = Date.now() - lastRefresh >= SIX_HOURS;

        let activeToken = token;
        let activeRefresh = storedRefresh ?? '';

        if (needsRefresh && storedRefresh) {
          const refreshed = await rawRefresh(storedRefresh);
          if (refreshed) {
            activeToken = refreshed.token;
            activeRefresh = refreshed.refreshToken;
            await Promise.all([
              AsyncStorage.setItem(TOKEN_KEY, activeToken),
              AsyncStorage.setItem(REFRESH_TOKEN_KEY, activeRefresh),
              AsyncStorage.setItem(LAST_REFRESH_KEY, String(Date.now())),
            ]);
          } else {
            // Refresh failed on startup — treat as unauthenticated
            await clearAuthStorage();
            setState(s => ({ ...s, isLoading: false }));
            return;
          }
        }

        const activeCompany = companyJson ? JSON.parse(companyJson) : null;
        setState(s => ({
          ...s,
          token: activeToken,
          refreshToken: activeRefresh,
          activeCompany,
          isAuthenticated: true,
          hasCompany: !!activeCompany,
          isLoading: false,
        }));
      } catch {
        setState(s => ({ ...s, isLoading: false }));
      }
    })();
  }, []);

  // ── AppState foreground listener ───────────────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState !== 'active') return;

      const current = stateRef.current;
      if (!current.isAuthenticated || !current.refreshToken) return;

      try {
        const lastRefreshStr = await AsyncStorage.getItem(LAST_REFRESH_KEY);
        const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : 0;
        if (Date.now() - lastRefresh < SIX_HOURS) return;

        const refreshed = await rawRefresh(current.refreshToken);
        if (refreshed) {
          await Promise.all([
            AsyncStorage.setItem(TOKEN_KEY, refreshed.token),
            AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshed.refreshToken),
            AsyncStorage.setItem(LAST_REFRESH_KEY, String(Date.now())),
          ]);
          setState(s => ({
            ...s,
            token: refreshed.token,
            refreshToken: refreshed.refreshToken,
          }));
        } else {
          // Refresh failed — sign out silently; navigation handles redirect
          await clearAuthStorage();
          apolloClient.clearStore();
          setState({ ...SIGNED_OUT_STATE });
        }
      } catch {
        // Network error etc. — don't sign out aggressively on transient failures
      }
    });

    return () => subscription.remove();
  }, []); // empty: AppState listener never needs to be re-registered

  // ── Auth actions ───────────────────────────────────────────────────────────
  const signIn = useCallback(async (token: string, refreshToken: string, user: UserNode) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, token),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
      AsyncStorage.setItem(LAST_REFRESH_KEY, String(Date.now())),
    ]);
    setState(s => ({
      ...s,
      token,
      refreshToken,
      user,
      isAuthenticated: true,
    }));
  }, []);

  const signOut = useCallback(async () => {
    await clearAuthStorage();
    apolloClient.clearStore();
    setState({ ...SIGNED_OUT_STATE });
  }, []);

  const setActiveCompany = useCallback(async (company: Company) => {
    await AsyncStorage.setItem(ACTIVE_COMPANY_KEY, JSON.stringify(company));
    setState(s => ({ ...s, activeCompany: company, hasCompany: true }));
  }, []);

  const updateUser = useCallback((user: UserNode) => {
    setState(s => ({ ...s, user }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, setActiveCompany, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

