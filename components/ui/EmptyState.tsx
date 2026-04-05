import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppColors, Radius, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={52} color={colors.primary} style={{ opacity: 0.3 }} />
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action && (
        <TouchableOpacity style={styles.btn} onPress={action.onPress} activeOpacity={0.8}>
          <Text style={styles.btnText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
    title: {
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
      marginTop: Spacing.md,
      textAlign: 'center',
    },
    description: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: Spacing.xs,
      lineHeight: 20,
    },
    btn: {
      marginTop: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.sm,
      backgroundColor: c.primary,
      borderRadius: Radius.md,
    },
    btnText: { color: '#fff', fontWeight: Typography.fontWeightSemibold },
  });
}
