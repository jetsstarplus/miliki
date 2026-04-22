import { MESSAGING_BALANCES, SUBSCRIPTION_STATUS } from '@/graphql/properties/queries/subscription';
import { useLazyQuery } from '@apollo/client';
import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useAuth } from './auth';

export interface MessagingBalances {
  smsBalance: string | null;
  whatsappBalance: string | null;
  smsTopupRate: string | null;
  whatsappTopupRate: string | null;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  currentPeriodEnd: string | null;
  plan: {
    id: string;
    name: string;
    planType: string;
  } | null;
}

interface MessagingContextValue {
  balances: MessagingBalances;
  subscription: SubscriptionInfo | null;
  balancesLoading: boolean;
  subscriptionLoading: boolean;
  refetchBalances: () => void;
  refetchSubscription: () => void;
}

const defaultBalances: MessagingBalances = {
  smsBalance: null,
  whatsappBalance: null,
  smsTopupRate: null,
  whatsappTopupRate: null,
};

const MessagingContext = createContext<MessagingContextValue>({
  balances: defaultBalances,
  subscription: null,
  balancesLoading: false,
  subscriptionLoading: false,
  refetchBalances: () => {},
  refetchSubscription: () => {},
});

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const { activeCompany, isAuthenticated } = useAuth();
  const lastCompanyId = useRef<string | null>(null);

  const [fetchBalances, { data: balancesData, loading: balancesLoading }] = useLazyQuery(
    MESSAGING_BALANCES,
    { fetchPolicy: 'network-only' },
  );

  const [fetchSubscription, { data: subscriptionData, loading: subscriptionLoading }] =
    useLazyQuery(SUBSCRIPTION_STATUS, { fetchPolicy: 'network-only' });

  const refetchBalances = useCallback(() => {
    if (activeCompany?.id) {
      fetchBalances({ variables: { companyId: activeCompany.id } });
    }
  }, [activeCompany?.id, fetchBalances]);

  const refetchSubscription = useCallback(() => {
    if (activeCompany?.id) {
      fetchSubscription({ variables: { companyId: activeCompany.id } });
    }
  }, [activeCompany?.id, fetchSubscription]);

  // Auto-fetch when authenticated company changes
  useEffect(() => {
    if (isAuthenticated && activeCompany?.id && activeCompany.id !== lastCompanyId.current) {
      lastCompanyId.current = activeCompany.id;
      fetchBalances({ variables: { companyId: activeCompany.id } });
      fetchSubscription({ variables: { companyId: activeCompany.id } });
    }
    if (!isAuthenticated) {
      lastCompanyId.current = null;
    }
  }, [isAuthenticated, activeCompany?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const balances: MessagingBalances = balancesData?.messagingBalances ?? defaultBalances;
  const subscription: SubscriptionInfo | null =
    subscriptionData?.subscriptionStatus?.subscription ?? null;

  return (
    <MessagingContext.Provider
      value={{
        balances,
        subscription,
        balancesLoading,
        subscriptionLoading,
        refetchBalances,
        refetchSubscription,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  return useContext(MessagingContext);
}
