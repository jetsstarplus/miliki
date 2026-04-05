import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';
import { AppColors, Radius, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`text_${variant}`],
            styles[`textSize_${size}`],
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.md,
      borderWidth: 0,
    },
    fullWidth: {
      width: '100%',
    },
    disabled: {
      opacity: 0.5,
    },

    variant_primary: {
      backgroundColor: c.primary,
    },
    variant_outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    variant_ghost: {
      backgroundColor: 'transparent',
    },
    variant_danger: {
      backgroundColor: c.error,
    },

    size_sm: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, minHeight: 36 },
    size_md: { paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg, minHeight: 48 },
    size_lg: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, minHeight: 56 },

    text: {
      fontWeight: Typography.fontWeightSemibold,
      letterSpacing: 0.2,
    },
    text_primary: { color: '#FFFFFF' },
    text_outline: { color: c.primary },
    text_ghost: { color: c.primary },
    text_danger: { color: '#FFFFFF' },

    textSize_sm: { fontSize: Typography.fontSizeSm },
    textSize_md: { fontSize: Typography.fontSizeMd },
    textSize_lg: { fontSize: Typography.fontSizeLg },
  });
}
