import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../context/theme';
import { AppHeader } from './AppHeader';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface PlaceholderScreenProps {
  title: string;
  icon: IoniconName;
  description?: string;
}

export function PlaceholderScreen({
  title,
  icon,
  description = 'This feature is coming soon.',
}: PlaceholderScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={title} />
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={48} color={colors.primary} style={{ opacity: 0.35 }} />
        </View>
        <Text style={styles.heading}>{title}</Text>
        <Text style={styles.sub}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    iconWrap: { marginBottom: Spacing.lg },
    heading: {
      fontSize: Typography.fontSizeXl,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    sub: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
