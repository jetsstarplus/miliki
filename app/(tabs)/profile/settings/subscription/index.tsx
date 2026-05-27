import { useMutation, useQuery } from '@apollo/client';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { AppColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useMessaging } from '@/context/messaging';
import { useTheme } from '@/context/theme';
import { SELECT_SUBSCRIPTION_PLAN_MUTATION } from '@/graphql/subscriptions/mutations';
import { SUBSCRIPTION_PLANS_QUERY, SUBSCRIPTION_STATUS_QUERY } from '@/graphql/subscriptions/queries';
import { BillingCycleToggle } from '../../../../../components/subscription/BillingCycleToggle';
import { CurrentSubscriptionCard } from '../../../../../components/subscription/CurrentSubscriptionCard';
import { SubscriptionPlanList } from '../../../../../components/subscription/SubscriptionPlanList';

export default function SubscriptionManagementScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { activeCompany, isAuthenticated } = useAuth();
  const { refetchSubscription } = useMessaging();

  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUALLY'>('MONTHLY');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: plansData, loading: plansLoading } = useQuery(SUBSCRIPTION_PLANS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: subscriptionStatusData,
    loading: subscriptionStatusLoading,
    refetch: refetchSubscriptionStatus,
  } = useQuery(SUBSCRIPTION_STATUS_QUERY, {
    variables: { companyId: activeCompany?.id },
    fetchPolicy: 'cache-and-network',
    skip: !activeCompany?.id,
  });

  const [selectSubscriptionPlan, { loading: selectingPlan }] = useMutation(
    SELECT_SUBSCRIPTION_PLAN_MUTATION,
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Manage Subscription" showBack />
        <ErrorState
          title="Session expired"
          message="Please sign in again to continue."
        />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Manage Subscription" showBack />
        <ErrorState
          title="Company required"
          message="Select a company before managing subscription."
        />
      </SafeAreaView>
    );
  }

  const availablePlans = ((plansData as any)?.subscriptionPlans?.edges ?? [])
    .map((edge: any) => edge?.node)
    .filter((plan: any) => plan?.isActive);

  const currentSubscription = (subscriptionStatusData as any)?.subscriptionStatus?.subscription;
  const visiblePlans = availablePlans.filter((plan: any) => plan?.id !== currentSubscription?.plan?.id);
  const selectedVisiblePlanId = visiblePlans.some((plan: any) => plan.id === selectedPlanId)
    ? selectedPlanId
    : null;

  async function runSelectPlan() {
    const companyId = activeCompany?.id;
    if (!companyId) return;

    if (!selectedPlanId) {
      Alert.alert('Select a plan', 'Choose a subscription plan first.');
      return;
    }

    try {
      const { data } = await selectSubscriptionPlan({
        variables: {
          companyId,
          planId: selectedPlanId,
          billingCycle,
        },
      });

      const payload = (data as any)?.selectSubscriptionPlan;
      if (payload?.success) {
        Alert.alert('Updated', payload?.message ?? 'Subscription plan updated.');
        await refetchSubscriptionStatus?.();
        refetchSubscription?.();
      } else {
        Alert.alert('Failed', payload?.message ?? 'Could not update subscription plan.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Could not update subscription plan.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Manage Subscription" showBack />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <CurrentSubscriptionCard
          planName={currentSubscription?.plan?.name}
          planType={currentSubscription?.plan?.planType}
          status={currentSubscription?.status}
          billingCycle={currentSubscription?.billingCycle}
          nextPaymentDate={currentSubscription?.nextPaymentDate}
          baseAmount={(subscriptionStatusData as any)?.subscriptionStatus?.amounts?.baseAmount}
          finalAmount={(subscriptionStatusData as any)?.subscriptionStatus?.amounts?.finalAmount}
          discountAmount={(subscriptionStatusData as any)?.subscriptionStatus?.amounts?.discountAmount}
          discountName={(subscriptionStatusData as any)?.subscriptionStatus?.amounts?.discountName}
          metrics={(subscriptionStatusData as any)?.subscriptionStatus?.metrics}
          loading={subscriptionStatusLoading}
        />

        <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />

        <SubscriptionPlanList
          plans={visiblePlans}
          selectedPlanId={selectedVisiblePlanId}
          billingCycle={billingCycle}
          loading={plansLoading}
          onSelect={setSelectedPlanId}
        />

        <TouchableOpacity
          style={[styles.primaryActionBtn, selectingPlan && { opacity: 0.6 }]}
          onPress={runSelectPlan}
          disabled={selectingPlan}
        >
          <Text style={styles.primaryActionText}>
            {selectingPlan ? 'Updating...' : 'Apply Selected Plan'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: {
      padding: Spacing.md,
      paddingBottom: Spacing.xxl,
      gap: Spacing.sm,
    },
    primaryActionBtn: {
      marginTop: Spacing.md,
      height: 42,
      borderRadius: Radius.md,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryActionText: {
      color: '#fff',
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
    },
  });
}
