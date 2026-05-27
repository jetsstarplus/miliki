import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { PaymentModal } from '@/components/ui/PaymentModal';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useMessaging } from '@/context/messaging';
import { useTheme } from '@/context/theme';
import { COMPANY_MEMBERSHIPS_QUERY } from '@/graphql/queries';
import {
    COMPANY_INVITATIONS_QUERY,
} from '@/graphql/subscriptions/queries';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type JourneyCardProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  badge?: string;
  count?: number | string;
  canManage?: boolean;
  onPress: () => void;
};

function JourneyCard({ icon, title, subtitle, badge, count, canManage = true, onPress }: JourneyCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.78} onPress={onPress}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardIconWrap}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.cardMetaRow}>
          {typeof count !== 'undefined' ? (
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{count}</Text>
            </View>
          ) : null}
          {badge ? (
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{badge}</Text>
            </View>
          ) : null}
          {!canManage ? (
            <View style={styles.readonlyPill}>
              <Text style={styles.readonlyPillText}>Read only</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <View style={styles.manageRow}>
        <Text style={styles.manageText}>{canManage ? 'Manage' : 'View'}</Text>
        <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default function CompanySettingsOverview() {
  const { isAuthenticated, activeCompany, user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isSmallTablet = width >= 768 && width < 1100;
  const isWideTablet = width >= 1100;
  const [subscriptionPayOpen, setSubscriptionPayOpen] = useState(false);

  const {
    subscription,
    refetchBalances,
    refetchSubscription,
  } = useMessaging();

  const {
    data: membershipsData,
    loading: membershipsLoading,
    refetch: refetchMemberships,
  } = useQuery(COMPANY_MEMBERSHIPS_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });

  const {
    data: invitationsData,
    refetch: refetchInvitations,
  } = useQuery(COMPANY_INVITATIONS_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });

  const memberships = (membershipsData as any)?.companyMemberships?.edges ?? [];
  const activeCompanyMembership = memberships.find((edge: any) => edge?.node?.company?.id === activeCompany?.id)?.node;
  const role = String(activeCompanyMembership?.role ?? '').toUpperCase();

  const canModifyCompany = role === 'OWNER' || role === 'ADMIN';
  const canManageMembers = role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';
  const canManageProperties = canModifyCompany || role === 'MANAGER';
  const canManagePayments = canModifyCompany || role === 'ACCOUNTANT';

  const memberCount = memberships.filter((edge: any) => edge?.node?.company?.id === activeCompany?.id).length;

  const pendingInvites = ((invitationsData as any)?.companyInvitations?.edges ?? []).filter(
    (edge: any) => edge?.node?.company?.id === activeCompany?.id,
  );

  useFocusEffect(
    useCallback(() => {
      refetchMemberships?.();
      refetchInvitations?.();
      refetchBalances?.();
      refetchSubscription?.();
    }, [refetchMemberships, refetchInvitations, refetchBalances, refetchSubscription]),
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Company Settings" />
        <ErrorState
          title="Session expired"
          message="Please sign in again to continue."
          onRetry={() => router.replace('/(auth)/login' as any)}
        />
      </SafeAreaView>
    );
  }

  if (!activeCompany) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Company Settings" />
        <ErrorState
          title="Company required"
          message="Select a company to manage settings."
          onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Company Settings" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={styles.heading}>{activeCompany.name}</Text>
          <Text style={styles.subHeading}>Manage your company settings</Text>
        </View>

        <View style={[styles.cardsGrid, isTablet && styles.cardsGridTablet]}>
          <View style={[styles.cardWrap, isSmallTablet && styles.cardWrapSmallTablet, isWideTablet && styles.cardWrapWideTablet]}>
            <JourneyCard
              icon="business-outline"
              title="Company Profile"
              subtitle="Contact details, address, billing defaults, bank details"
              badge="Live"
              canManage={canModifyCompany}
              onPress={() => router.push('/(tabs)/profile/settings/edit' as any)}
            />
          </View>

          <View style={[styles.cardWrap, isSmallTablet && styles.cardWrapSmallTablet, isWideTablet && styles.cardWrapWideTablet]}>
            <JourneyCard
              icon="phone-portrait-outline"
              title="M-Pesa Setup"
              subtitle="List setups, activate one, register URLs, balance and pull actions"
              count={canManagePayments ? 'Manage' : 'View'}
              canManage={canManagePayments}
              onPress={() => router.push('/(tabs)/payments/mpesa-setup' as any)}
            />
          </View>

          <View style={[styles.cardWrap, isSmallTablet && styles.cardWrapSmallTablet, isWideTablet && styles.cardWrapWideTablet]}>
            <JourneyCard
              icon="server-outline"
              title="Gateway Credentials"
              subtitle="Credentials, webhooks, and provider endpoint values"
              badge="Integrations"
              canManage={canManagePayments || canModifyCompany}
              onPress={() => router.push('/(tabs)/payments/gateway-credentials' as any)}
            />
          </View>

          <View style={[styles.cardWrap, isSmallTablet && styles.cardWrapSmallTablet, isWideTablet && styles.cardWrapWideTablet]}>
            <JourneyCard
              icon="construct-outline"
              title="Service Types"
              subtitle="Payment/service type definitions and allowed payment modes"
              canManage={canManagePayments || canModifyCompany}
              onPress={() => router.push('/(tabs)/profile/settings/service-types' as any)}
            />
          </View>

          <View style={[styles.cardWrap, isSmallTablet && styles.cardWrapSmallTablet, isWideTablet && styles.cardWrapWideTablet]}>
            <JourneyCard
              icon="cash-outline"
              title="Payment Modes"
              subtitle="Manage collection channels, references, linked account, and reconciliation behavior"
              canManage={canManagePayments || canModifyCompany}
              onPress={() => router.push('/(tabs)/profile/settings/payment-modes' as any)}
            />
          </View>

          <View style={[styles.cardWrap, isSmallTablet && styles.cardWrapSmallTablet, isWideTablet && styles.cardWrapWideTablet]}>
            <JourneyCard
              icon="layers-outline"
              title="Unit Types"
              subtitle="Create, edit, activate/deactivate, and delete unit types"
              canManage={canManageProperties}
              onPress={() => router.push('/(tabs)/profile/settings/unit-types' as any)}
            />
          </View>

          <View style={[styles.cardWrap, isSmallTablet && styles.cardWrapSmallTablet, isWideTablet && styles.cardWrapWideTablet]}>
            <JourneyCard
              icon="shield-checkmark-outline"
              title="User Roles and Access"
              subtitle="Role assignment, permission toggles, and invite lifecycle"
              badge={role || 'Unknown role'}
              canManage={canManageMembers}
              onPress={() => router.push('/(tabs)/profile/settings/user-roles' as any)}
            />
          </View>

          <View style={[styles.cardWrap, isSmallTablet && styles.cardWrapSmallTablet, isWideTablet && styles.cardWrapWideTablet]}>
            <JourneyCard
              icon="mail-open-outline"
              title="Pending Invitations"
              subtitle="Review pending invites and resend when supported"
              count={pendingInvites.length}
              canManage={canManageMembers}
              onPress={() => {
                if (!canManageMembers) {
                  Alert.alert('Access denied', 'You do not have permission to manage invitations.');
                  return;
                }
                Alert.alert('Coming soon', 'Invitation management actions will be added in this flow.');
              }}
            />
          </View>

          <View style={[styles.cardWrap, isSmallTablet && styles.cardWrapSmallTablet, isWideTablet && styles.cardWrapWideTablet]}>
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name="card-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.cardMetaRow}>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{subscription?.status ? String(subscription.status) : 'Unknown'}</Text>
                  </View>
                  {!canModifyCompany ? (
                    <View style={styles.readonlyPill}>
                      <Text style={styles.readonlyPillText}>Read only</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Text style={styles.cardTitle}>Subscription Plan</Text>
              <Text style={styles.cardSubtitle}>Manage current plan and trigger subscription payment anytime.</Text>
              <View style={styles.subscriptionActionsRow}>
                <TouchableOpacity
                  style={[styles.subscriptionActionBtn, !canModifyCompany && { opacity: 0.6 }]}
                  disabled={!canModifyCompany}
                  onPress={() => router.push('/(tabs)/profile/settings/subscription' as any)}
                >
                  <Ionicons name="options-outline" size={14} color={colors.primary} />
                  <Text style={styles.subscriptionActionText}>Manage Subscription</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subscriptionActionBtn, !canModifyCompany && { opacity: 0.6 }]}
                  disabled={!canModifyCompany}
                  onPress={() => setSubscriptionPayOpen(true)}
                >
                  <Ionicons name="cash-outline" size={14} color={Colors.success} />
                  <Text style={styles.subscriptionActionText}>Pay Subscription</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.footerText}>Signed in as {user?.email ?? 'user'}.</Text>
      </ScrollView>

      {activeCompany?.id ? (
        <PaymentModal
          visible={subscriptionPayOpen}
          onClose={() => setSubscriptionPayOpen(false)}
          mode="subscription"
          companyId={activeCompany.id}
          onSuccess={() => {
            refetchSubscription?.();
            setSubscriptionPayOpen(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
    cardsGrid: {
      width: '100%',
    },
    cardsGridTablet: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    cardWrap: {
      width: '100%',
    },
    cardWrapSmallTablet: {
      width: '48.5%',
    },
    cardWrapWideTablet: {
      width: '32%',
    },

    headerBlock: {
      marginBottom: Spacing.sm,
      paddingHorizontal: 2,
    },
    heading: {
      fontSize: Typography.fontSizeXl,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
    },
    subHeading: {
      marginTop: 2,
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      fontWeight: Typography.fontWeightSemibold,
    },
    subtleText: {
      marginTop: Spacing.xs,
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      lineHeight: 18,
    },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...Shadow.sm,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    cardIconWrap: {
      width: 34,
      height: 34,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.overlay,
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    countPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
      backgroundColor: c.overlay,
    },
    countPillText: {
      fontSize: Typography.fontSizeXs,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
    badgePill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
      backgroundColor: Colors.success + '20',
    },
    badgePillText: {
      fontSize: Typography.fontSizeXs,
      color: Colors.success,
      fontWeight: Typography.fontWeightSemibold,
      textTransform: 'uppercase',
    },
    readonlyPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
      backgroundColor: Colors.warning + '20',
    },
    readonlyPillText: {
      fontSize: Typography.fontSizeXs,
      color: Colors.warning,
      fontWeight: Typography.fontWeightSemibold,
    },
    cardTitle: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
      marginBottom: 2,
    },
    cardSubtitle: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      lineHeight: 20,
    },
    manageRow: {
      marginTop: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 2,
    },
    manageText: {
      fontSize: Typography.fontSizeSm,
      color: c.textMuted,
      fontWeight: Typography.fontWeightSemibold,
    },

    footerText: {
      marginTop: Spacing.sm,
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      textAlign: 'center',
    },
    subscriptionActionsRow: {
      marginTop: Spacing.sm,
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    subscriptionActionBtn: {
      flex: 1,
      height: 36,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    subscriptionActionText: {
      fontSize: Typography.fontSizeXs,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
    },
  });
}
