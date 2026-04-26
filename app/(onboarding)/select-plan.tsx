import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/auth';
import { useTheme } from '../../context/theme';
import { SELECT_SUBSCRIPTION_PLAN_MUTATION } from '../../graphql/subscriptions/mutations';
import { SUBSCRIPTION_PLANS_QUERY } from '../../graphql/subscriptions/queries';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnually: number;
  maxUnits: number;
  maxProperties: number;
  maxTenants: number;
  features: string[];
  isActive: boolean;
}

export default function SelectPlan() {
  const router = useRouter();
  const { activeCompany, setHasSubscription, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUALLY'>('MONTHLY');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  const { data, loading } = useQuery(SUBSCRIPTION_PLANS_QUERY, {
    fetchPolicy: 'network-only',
  });

  const [selectPlan] = useMutation(SELECT_SUBSCRIPTION_PLAN_MUTATION);

  const plans: Plan[] =
    data?.subscriptionPlans?.edges
      ?.map((e: any) => e.node)
      ?.filter((p: Plan) => p.isActive) ?? [];

  async function handleSelectPlan() {
    if (!selectedPlanId) {
      Alert.alert('Select a plan', 'Please choose a subscription plan to continue.');
      return;
    }
    if (!activeCompany) return;
    setSelecting(true);
    try {
      const { data: result } = await selectPlan({
        variables: {
          companyId: activeCompany.id,
          planId: selectedPlanId,
          billingCycle,
        },
      });
      const res = result?.selectSubscriptionPlan;
      if (res?.success) {
        await setHasSubscription(true);
        if (res.requiresGettingStarted) {
          router.replace('/(onboarding)/getting-started' as any);
        } else {
          router.replace('/(tabs)/home' as any);
        }
      } else {
        Alert.alert('Failed', res?.message ?? 'Could not select plan. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong.');
    } finally {
      setSelecting(false);
    }
  }

  function formatPrice(plan: Plan) {
    const price = billingCycle === 'MONTHLY' ? plan.priceMonthly : plan.priceAnnually;
    if (!price || price === 0) return 'Free';
    return `KES ${Number(price).toLocaleString('en-KE')}${billingCycle === 'MONTHLY' ? '/mo' : '/yr'}`;
  }

  function parsedFeatures(plan: Plan): string[] {
    try {
      if (Array.isArray(plan.features)) return plan.features;
      if (typeof plan.features === 'string') return JSON.parse(plan.features);
    } catch { /* fall through */ }
    return [];
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Choose your plan</Text>
          <Text style={styles.subtitle}>
            Select the plan that fits your portfolio size
          </Text>
        </View>

        {/* Billing cycle toggle */}
        <View style={styles.cycleRow}>
          <TouchableOpacity
            style={[styles.cycleBtn, billingCycle === 'MONTHLY' && styles.cycleBtnActive]}
            onPress={() => setBillingCycle('MONTHLY')}
          >
            <Text style={[styles.cycleBtnText, billingCycle === 'MONTHLY' && styles.cycleBtnTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cycleBtn, billingCycle === 'ANNUALLY' && styles.cycleBtnActive]}
            onPress={() => setBillingCycle('ANNUALLY')}
          >
            <Text style={[styles.cycleBtnText, billingCycle === 'ANNUALLY' && styles.cycleBtnTextActive]}>
              Annual
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 20%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading plans…</Text>
          </View>
        ) : plans.length === 0 ? (
          <Text style={styles.emptyText}>No plans available at the moment.</Text>
        ) : (
          plans.map(plan => {
            const isSelected = selectedPlanId === plan.id;
            const features = parsedFeatures(plan);
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => setSelectedPlanId(plan.id)}
                activeOpacity={0.85}
              >
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text style={styles.selectedBadgeText}>Selected</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={[styles.planPrice, isSelected && { color: colors.primary }]}>
                    {formatPrice(plan)}
                  </Text>
                </View>

                <View style={styles.planLimits}>
                  {plan.maxProperties > 0 && (
                    <View style={styles.limitChip}>
                      <Text style={styles.limitText}>{plan.maxProperties} buildings</Text>
                    </View>
                  )}
                  {plan.maxUnits > 0 && (
                    <View style={styles.limitChip}>
                      <Text style={styles.limitText}>{plan.maxUnits} units</Text>
                    </View>
                  )}
                  {plan.maxTenants > 0 && (
                    <View style={styles.limitChip}>
                      <Text style={styles.limitText}>{plan.maxTenants} tenants</Text>
                    </View>
                  )}
                </View>

                {features.length > 0 && (
                  <View style={styles.featureList}>
                    {features.map((f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <Ionicons name="checkmark" size={14} color={Colors.success} />
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.footer}>
          <Button
            title={selecting ? 'Activating…' : 'Continue with selected plan'}
            onPress={handleSelectPlan}
            loading={selecting}
            disabled={!selectedPlanId || selecting}
          />
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof import('../../context/theme').useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xl,
    },
    header: {
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.lg,
    },
    title: {
      fontSize: Typography.fontSize2xl,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.fontSizeMd,
      color: c.textSecondary,
    },
    cycleRow: {
      flexDirection: 'row',
      backgroundColor: c.overlay,
      borderRadius: Radius.sm,
      padding: 3,
      marginBottom: Spacing.lg,
    },
    cycleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      borderRadius: Radius.sm - 2,
      gap: Spacing.xs,
    },
    cycleBtnActive: {
      backgroundColor: c.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    cycleBtnText: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightMedium,
      color: c.textMuted,
    },
    cycleBtnTextActive: { color: c.text },
    saveBadge: {
      backgroundColor: Colors.success + '20',
      borderRadius: 20,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    saveBadgeText: {
      fontSize: 10,
      fontWeight: Typography.fontWeightSemibold,
      color: Colors.success,
    },
    loadingWrap: {
      alignItems: 'center',
      paddingVertical: Spacing.xl * 2,
      gap: Spacing.md,
    },
    loadingText: { fontSize: Typography.fontSizeSm, color: c.textMuted },
    emptyText: {
      textAlign: 'center',
      color: c.textMuted,
      paddingVertical: Spacing.xl,
    },
    planCard: {
      backgroundColor: c.card,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    planCardSelected: {
      borderColor: c.primary,
      backgroundColor: c.primary + '08',
    },
    selectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: Spacing.xs,
    },
    selectedBadgeText: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
      color: c.primary,
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    planName: {
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
    },
    planPrice: {
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
    },
    planLimits: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    limitChip: {
      backgroundColor: c.overlay,
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
    },
    limitText: {
      fontSize: Typography.fontSizeXs,
      color: c.textSecondary,
    },
    featureList: { gap: 6 },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    featureText: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      flex: 1,
    },
    footer: {
      marginTop: Spacing.md,
      gap: Spacing.sm,
    },
    signOutBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
    signOutText: { fontSize: Typography.fontSizeMd, color: Colors.error },
  });
}
