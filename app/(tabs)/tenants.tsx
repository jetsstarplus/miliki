import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing, Typography } from '../../constants/theme';

export default function Tenants() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.container}>
        <Text style={styles.title}>Tenants</Text>
        <Card padded>
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No tenants yet</Text>
            <Text style={styles.emptyText}>
              Add your first tenant once you have a property set up.
            </Text>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.xl },
  title: { fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold, color: Colors.text, marginBottom: Spacing.xl },
  empty: { alignItems: 'center', padding: Spacing.lg },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightSemibold, color: Colors.text, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.fontSizeSm, color: Colors.textSecondary, textAlign: 'center' },
});
