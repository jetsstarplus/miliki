import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppColors, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface InfoRowProps {
  icon: IoniconName;
  label: string;
  value?: string | null;
  onPress?: () => void;
}

export function InfoRow({ icon, label, value, onPress }: InfoRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!value) return null;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.65 : 1}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, onPress && { color: colors.primary }]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.xs + 2,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { fontSize: Typography.fontSizeXs, color: c.textMuted },
    value: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightMedium,
      marginTop: 1,
    },
  });
}
