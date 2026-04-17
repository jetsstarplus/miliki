import { AppHeader } from '@/components/AppHeader';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MenuItem {
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route: string;
  accentColor: string;
}

export default function PaymentsMenu() {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const menuItems: MenuItem[] = [
    {
      label: 'Transactions',
      description: 'View all received payments and allocate them to tenant accounts.',
      icon: 'receipt-outline',
      route: '/(tabs)/payments/transactions',
      accentColor: '#3B82F6',
    },
    {
      label: 'Unmatched Payments',
      description: 'Payments received from any channel that could not be automatically matched to a unit.',
      icon: 'git-branch-outline',
      route: '/(tabs)/payments/unmatched',
      accentColor: '#F59E0B',
    },
    {
      label: 'Manual Receipts',
      description: 'View and validate manually raised payment receipts.',
      icon: 'document-text-outline',
      route: '/(tabs)/payments/manual',
      accentColor: '#10B981',
    },
    {
      label: 'SMS Read Policies',
      description: 'Configure per-device SMS reading policies to auto-capture payment receipts.',
      icon: 'phone-portrait-outline',
      route: '/(tabs)/payments/sms-credentials',
      accentColor: '#8B5CF6',
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Payments" />
      <View style={styles.body}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.accentColor + '18' }]}>
              <Ionicons name={item.icon} size={24} color={item.accentColor} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    body: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1 },
    cardLabel: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
      marginBottom: 3,
    },
    cardDesc: {
      fontSize: Typography.fontSizeXs,
      color: c.textSecondary,
      lineHeight: 16,
    },
  });
}
