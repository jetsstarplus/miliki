import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppColors, Radius, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    title: {
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
      marginTop: Spacing.md,
      textAlign: 'center',
    },
    message: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      marginTop: Spacing.xs,
      textAlign: 'center',
    },
    retryBtn: {
      marginTop: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.sm,
      backgroundColor: c.primary,
      borderRadius: Radius.md,
    },
    retryText: { color: '#fff', fontWeight: Typography.fontWeightSemibold },
  });
}
