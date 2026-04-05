import React, { useMemo } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/ui/Card';
import { AppColors, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

export default function Properties() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      <AppHeader title="Properties" />
      <View style={styles.container}>
        <Card padded>
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏗️</Text>
            <Text style={styles.emptyTitle}>No properties yet</Text>
            <Text style={styles.emptyText}>Add your first building to get started.</Text>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    container: { flex: 1, padding: Spacing.xl },
    empty: { alignItems: 'center', padding: Spacing.lg },
    emptyEmoji: { fontSize: 40, marginBottom: Spacing.md },
    emptyTitle: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightSemibold, color: c.text, marginBottom: Spacing.sm },
    emptyText: { fontSize: Typography.fontSizeSm, color: c.textSecondary, textAlign: 'center' },
  });
}
