import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { SWITCH_COMPANY_MUTATION } from '@/graphql/companies/mutations';
import { COMPANY_MEMBERSHIPS_QUERY } from '@/graphql/queries';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
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

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Company Owner',
  ADMIN: 'Administrator',
  MANAGER: 'Property Manager',
  ACCOUNTANT: 'Accountant',
  AGENT: 'Field Agent',
  EMPLOYEE: 'Employee',
};

const ROLE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  OWNER: 'ribbon-outline',
  ADMIN: 'shield-checkmark-outline',
  MANAGER: 'briefcase-outline',
  ACCOUNTANT: 'calculator-outline',
  AGENT: 'person-outline',
  EMPLOYEE: 'people-outline',
};

type MembershipEdge = {
  node: {
    id: string;
    role: string;
    status: string;
    company: {
      id: string;
      name: string;
      companyType: string;
      status: string;
      email: string;
    };
  };
};

export default function CompanySwitcher() {
  const { activeCompany, setActiveCompany } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const apolloClient = useApolloClient();

  const { data, loading, error, refetch } = useQuery(COMPANY_MEMBERSHIPS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const [switchCompany, { loading: switching }] = useMutation(SWITCH_COMPANY_MUTATION);

  const memberships: MembershipEdge[] = (data as any)?.companyMemberships?.edges ?? [];

  async function handleSwitch(node: MembershipEdge['node']) {
    if (node.company.id === activeCompany?.id) {
      Alert.alert('Already Active', `You are already using ${node.company.name}.`);
      return;
    }

    try {
      const { data: result } = await switchCompany({
        variables: { companyId: node.company.id },
      });

      const payload = (result as any)?.switchCompany;
      if (payload?.success && payload?.company) {
        const c = payload.company;
        await setActiveCompany({
          id: c.id,
          name: c.name,
          companyType: c.companyType,
          status: c.status,
          email: c.email,
        });
        await apolloClient.clearStore();
        router.replace('/(tabs)/home' as any);
         // Reset store AFTER navigating so all remounted/active queries
        // refetch against the new company context.
        apolloClient.resetStore().catch(() => {/* ignore reset errors */});
      } else {
        Alert.alert('Error', payload?.message ?? 'Failed to switch company.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safe.backgroundColor} />
      <AppHeader title="Switch Company" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.hint}>
          Select a company to switch your active workspace.
        </Text>

        {loading && !data ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : error ? (
          <ErrorState message="Could not load roles." onRetry={() => refetch()} />
        ) : memberships.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No company memberships found.</Text>
          </View>
        ) : (
          memberships.map(({ node }) => {
            const isActive = node.company.id === activeCompany?.id;
            const isInactive = node.status !== 'ACTIVE';
            const icon = ROLE_ICONS[node.role] ?? 'person-outline';
            const label = ROLE_LABELS[node.role] ?? node.role;

            return (
              <TouchableOpacity
                key={node.id}
                style={[styles.roleCard, isActive && styles.roleCardActive, isInactive && styles.roleCardInactive]}
                onPress={() => handleSwitch(node)}
                activeOpacity={0.7}
                disabled={switching || isInactive}
              >
                <View style={[styles.roleIconWrap, isActive && styles.roleIconWrapActive]}>
                  <Ionicons name={icon} size={22} color={isActive ? '#fff' : isInactive ? colors.textMuted : colors.primary} />
                </View>

                <View style={styles.roleInfo}>
                  <Text style={[styles.companyName, isActive && styles.companyNameActive, isInactive && styles.textMuted]}>
                    {node.company.name}
                  </Text>
                  <Text style={[styles.roleLabel, isInactive && styles.textMuted]}>
                    {label}{isInactive ? ' · Inactive' : ''}
                  </Text>
                </View>

                <View style={styles.badges}>
                  {isActive ? (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },

    hint: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      marginBottom: Spacing.md,
    },

    roleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      gap: Spacing.sm,
      borderWidth: 1.5,
      borderColor: 'transparent',
      ...Shadow.sm,
    },
    roleCardActive: {
      borderColor: c.primary,
      backgroundColor: c.surface,
    },
    roleCardInactive: {
      opacity: 0.55,
    },

    roleIconWrap: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    roleIconWrapActive: {
      backgroundColor: c.primary,
    },

    roleInfo: { flex: 1 },
    companyName: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    companyNameActive: { color: c.primary },
    roleLabel: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      marginTop: 2,
    },
    textMuted: { color: c.textMuted },

    badges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },

    emptyWrap: { alignItems: 'center', marginTop: Spacing.xxl, gap: Spacing.md },
    emptyText: { fontSize: Typography.fontSizeMd, color: c.textMuted },
  });
}
