import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.container}>
        {/* Hero section */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/images/favicons/logo-wide.png')}
              style={styles.logoWide}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.tagline}>Property Management{'\n'}Made Simple</Text>
          <Text style={styles.subtitle}>
            Manage your properties, tenants, and rental income from one powerful platform.
          </Text>
        </View>

        {/* Feature pills */}
        <View style={styles.pillsRow}>
          {['Buildings', 'Tenants', 'Payments', 'Reports'].map(f => (
            <View key={f} style={styles.pill}>
              <Text style={styles.pillText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Button
            title="Get Started"
            onPress={() => router.push('/(auth)/register')}
            size="lg"
          />
          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Already have an account? </Text>
            <Text
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login')}
            >
              Sign In
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: Spacing.xl,
  },
  logoWide: {
    width: 260,
    height: 80,
  },
  tagline: {
    fontSize: Typography.fontSize2xl,
    fontWeight: Typography.fontWeightBold,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: Typography.fontSize2xl * Typography.lineHeightTight,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.fontSizeMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSizeMd * Typography.lineHeightNormal,
    paddingHorizontal: Spacing.md,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  pill: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.overlay,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.primary,
    fontWeight: Typography.fontWeightMedium,
  },
  cta: {
    gap: Spacing.md,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  loginPrompt: {
    fontSize: Typography.fontSizeMd,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: Typography.fontSizeMd,
    color: Colors.primary,
    fontWeight: Typography.fontWeightSemibold,
  },
});
