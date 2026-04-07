import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ACTIVE_COMPANY_KEY, REFRESH_TOKEN_KEY, TOKEN_KEY } from '../constants/api';
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

/** Parsed from the `authContext` scalar returned by the API */
export interface AuthContextData {
  currentRole: string;
  currentRoleDisplay: string;
  hasMultipleRoles: boolean;
  flags: {
    isAdministrator: boolean;
    isLandlord: boolean;
    isAgent: boolean;
    isTenant: boolean;
    isAccountant: boolean;
    isMaintenance: boolean;
  };
  availableRoles: Array<{ id: number; role: string; isPrimary: boolean; tenantId: string | null; buildingId: string | null }>;
}

/** Parsed from the `companiesContext` scalar returned by the API */
export interface CompaniesContextData {
  hasCompanies: boolean;
  currentCompany: { id: string; name: string } | null;
  userCompanies: Array<{ companyId: string; companyName: string; role: string }>;
  permissions: {
    isCompanyOwner: boolean;
    canManageProperties: boolean;
    canManagePayments: boolean;
    canValidatePayments: boolean;
    canViewAccounting: boolean;
    canManageMembers: boolean;
  };
  subscription: {
    lockedBuildingIds: string[];
    lockedUnitIds: string[];
    overPropertiesLimit: boolean;
    overUnitsLimit: boolean;
  };
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserNode | null;
  activeCompany: Company | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompany: boolean;
  /** Populated after calling AUTH_CONTEXT_QUERY post-login */
  roleContext: AuthContextData | null;
  /** Populated after calling AUTH_CONTEXT_QUERY post-login */
  companiesContext: CompaniesContextData | null;
}

interface AuthContextValue extends AuthState {
  signIn: (token: string, refreshToken: string, user: UserNode) => Promise<void>;
  signOut: () => Promise<void>;
  setActiveCompany: (company: Company) => Promise<void>;
  updateUser: (user: UserNode) => void;
  setRoleContext: (roleCtx: AuthContextData, companiesCtx: CompaniesContextData) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    refreshToken: null,
    user: null,
    activeCompany: null,
    isLoading: true,
    isAuthenticated: false,
    hasCompany: false,
    roleContext: null,
    companiesContext: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const [token, refreshToken, companyJson] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(REFRESH_TOKEN_KEY),
          AsyncStorage.getItem(ACTIVE_COMPANY_KEY),
        ]);
        const activeCompany = companyJson ? JSON.parse(companyJson) : null;
        setState(s => ({
          ...s,
          token,
          refreshToken,
          activeCompany,
          isAuthenticated: !!token,
          hasCompany: !!activeCompany,
          isLoading: false,
        }));
      } catch {
        setState(s => ({ ...s, isLoading: false }));
      }
    })();
  }, []);

  const signIn = useCallback(async (token: string, refreshToken: string, user: UserNode) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, token),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
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
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(ACTIVE_COMPANY_KEY),
    ]);
    apolloClient.clearStore();
    setState({
      token: null,
      refreshToken: null,
      user: null,
      activeCompany: null,
      isLoading: false,
      isAuthenticated: false,
      hasCompany: false,
      roleContext: null,
      companiesContext: null,
    });
  }, []);

  const setActiveCompany = useCallback(async (company: Company) => {
    await AsyncStorage.setItem(ACTIVE_COMPANY_KEY, JSON.stringify(company));
    setState(s => ({ ...s, activeCompany: company, hasCompany: true }));
  }, []);

  const updateUser = useCallback((user: UserNode) => {
    setState(s => ({ ...s, user }));
  }, []);

  const setRoleContext = useCallback(
    (roleCtx: AuthContextData, companiesCtx: CompaniesContextData) => {
      setState(s => ({ ...s, roleContext: roleCtx, companiesContext: companiesCtx }));
    },
    [],
  );

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, setActiveCompany, updateUser, setRoleContext }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
