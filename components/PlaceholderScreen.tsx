import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../constants/theme';
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
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={title} />
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={48} color={Colors.primary} style={{ opacity: 0.35 }} />
        </View>
        <Text style={styles.heading}>{title}</Text>
        <Text style={styles.sub}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  iconWrap: { marginBottom: Spacing.lg },
  heading: {
    fontSize: Typography.fontSizeXl,
    fontWeight: Typography.fontWeightBold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  sub: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
