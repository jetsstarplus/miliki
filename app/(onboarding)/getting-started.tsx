import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/auth';
import { useTheme } from '../../context/theme';
import { SKIP_GETTING_STARTED_MUTATION } from '../../graphql/subscriptions/mutations';
import { GETTING_STARTED_QUERY } from '../../graphql/subscriptions/queries';

interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  url?: string;
}

const STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  add_building: 'business-outline',
  add_unit: 'home-outline',
  add_tenant: 'person-outline',
  create_occupancy: 'key-outline',
  configure_payments: 'card-outline',
  invite_member: 'people-outline',
};

export default function GettingStarted() {
  const router = useRouter();
  const { activeCompany } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data, loading } = useQuery(GETTING_STARTED_QUERY, {
    variables: { companyId: activeCompany?.id },
    skip: !activeCompany?.id,
    fetchPolicy: 'network-only',
  });

  const [skipGettingStarted, { loading: skipping }] = useMutation(SKIP_GETTING_STARTED_MUTATION);

  // The API returns a JSON blob
  const gettingStartedData = useMemo(() => {
    try {
      const raw = data?.subscriptionGettingStartedData;
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }, [data]);

  const steps: ChecklistItem[] = useMemo(() => {
    if (!gettingStartedData) return [];
    // Normalise whatever shape the server returns into a flat list
    const items = gettingStartedData?.steps ?? gettingStartedData?.checklist ?? gettingStartedData?.items ?? [];
    return Array.isArray(items) ? items : [];
  }, [gettingStartedData]);

  const completedCount = steps.filter(s => s.completed).length;
  const progress = steps.length > 0 ? completedCount / steps.length : 0;

  async function handleSkip() {
    if (!activeCompany?.id) {
      router.replace('/(tabs)/home' as any);
      return;
    }
    try {
      await skipGettingStarted({ variables: { companyId: activeCompany.id } });
    } catch {
      // Skip silently — navigate regardless
    }
    router.replace('/(tabs)/home' as any);
  }

  function handleGoToDashboard() {
    router.replace('/(tabs)/home' as any);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>You're all set! 🎉</Text>
          <Text style={styles.subtitle}>
            Complete these steps to get the most out of your workspace
          </Text>
        </View>

        {/* Progress bar */}
        {steps.length > 0 && (
          <Card style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Setup progress</Text>
              <Text style={styles.progressCount}>
                {completedCount}/{steps.length} completed
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
            </View>
          </Card>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading your checklist…</Text>
          </View>
        ) : steps.length === 0 ? (
          // No structured checklist from API — show a default guide
          <DefaultChecklist colors={colors} styles={styles} />
        ) : (
          steps.map((step, i) => {
            const icon = STEP_ICONS[step.key] ?? 'ellipse-outline';
            return (
              <Card key={step.key ?? i} style={[styles.stepCard, step.completed && styles.stepCardDone]}>
                <View style={[styles.stepIconWrap, step.completed && styles.stepIconWrapDone]}>
                  {step.completed ? (
                    <Ionicons name="checkmark" size={18} color={Colors.success} />
                  ) : (
                    <Ionicons name={icon} size={18} color={colors.primary} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, step.completed && styles.stepTitleDone]}>
                    {step.title}
                  </Text>
                  {!!step.description && (
                    <Text style={styles.stepDesc}>{step.description}</Text>
                  )}
                </View>
                {step.completed && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                )}
              </Card>
            );
          })
        )}

        <View style={styles.actions}>
          {completedCount === steps.length && steps.length > 0 ? (
            <Button title="Go to Dashboard" onPress={handleGoToDashboard} />
          ) : (
            <>
              <Button title="Go to Dashboard" onPress={handleGoToDashboard} />
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleSkip}
                disabled={skipping}
              >
                <Text style={styles.skipText}>
                  {skipping ? 'Skipping…' : 'Skip for now'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DefaultChecklist({ colors, styles }: { colors: any; styles: any }) {
  const DEFAULT_STEPS = [
    {
      icon: 'business-outline' as const,
      title: 'Add your first building',
      desc: 'Create a building to start managing your properties',
    },
    {
      icon: 'home-outline' as const,
      title: 'Add units to your building',
      desc: 'Define the individual units available for rent',
    },
    {
      icon: 'person-outline' as const,
      title: 'Add your tenants',
      desc: 'Register tenant profiles with their contact details',
    },
    {
      icon: 'key-outline' as const,
      title: 'Assign tenants to units',
      desc: 'Create occupancies to start generating rent schedules',
    },
    {
      icon: 'card-outline' as const,
      title: 'Configure payment settings',
      desc: 'Set up M-Pesa or other payment methods for rent collection',
    },
  ];

  return (
    <>
      {DEFAULT_STEPS.map((step, i) => (
        <View key={i} style={[styles.stepCard, { borderColor: colors.border }]}>
          <View style={styles.stepIconWrap}>
            <Ionicons name={step.icon} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>
          </View>
        </View>
      ))}
    </>
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
      lineHeight: 22,
    },
    progressCard: {
      marginBottom: Spacing.md,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    progressLabel: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      fontWeight: Typography.fontWeightMedium,
    },
    progressCount: {
      fontSize: Typography.fontSizeSm,
      color: c.primary,
      fontWeight: Typography.fontWeightSemibold,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: c.border,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: c.primary,
    },
    loadingWrap: {
      alignItems: 'center',
      paddingVertical: Spacing.xl * 2,
      gap: Spacing.md,
    },
    loadingText: { fontSize: Typography.fontSizeSm, color: c.textMuted },
    stepCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      marginBottom: Spacing.sm,
      padding: Spacing.md,
      backgroundColor: c.card,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    stepCardDone: {
      backgroundColor: Colors.success + '08',
      borderColor: Colors.success + '40',
    },
    stepIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepIconWrapDone: {
      backgroundColor: Colors.success + '18',
    },
    stepTitle: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
      marginBottom: 2,
    },
    stepTitleDone: {
      color: c.textMuted,
      textDecorationLine: 'line-through',
    },
    stepDesc: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      lineHeight: 16,
    },
    actions: {
      marginTop: Spacing.lg,
      gap: Spacing.sm,
    },
    skipBtn: {
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },
    skipText: {
      fontSize: Typography.fontSizeMd,
      color: c.textMuted,
    },
  });
}
