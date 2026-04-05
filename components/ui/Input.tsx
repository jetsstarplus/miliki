import React, { useMemo, useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { AppColors, Radius, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureToggle?: boolean;
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  leftIcon,
  rightIcon,
  secureToggle,
  secureTextEntry,
  ...rest
}: InputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : null]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isSecure}
          autoCapitalize="none"
          {...rest}
        />
        {(rightIcon || secureToggle) && (
          <TouchableOpacity
            style={styles.icon}
            onPress={secureToggle ? () => setIsSecure(!isSecure) : undefined}
          >
            {secureToggle ? (
              <Text style={styles.toggleText}>{isSecure ? 'Show' : 'Hide'}</Text>
            ) : (
              rightIcon
            )}
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      marginBottom: Spacing.md,
    },
    label: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightMedium,
      color: c.text,
      marginBottom: Spacing.xs,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.inputBackground,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    inputRowError: {
      borderColor: c.error,
    },
    input: {
      flex: 1,
      fontSize: Typography.fontSizeMd,
      color: c.text,
      paddingVertical: Spacing.sm + 2,
      paddingHorizontal: Spacing.md,
      minHeight: 48,
    },
    inputWithLeft: {
      paddingLeft: 0,
    },
    icon: {
      paddingHorizontal: Spacing.sm + 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleText: {
      fontSize: Typography.fontSizeSm,
      color: c.primary,
      fontWeight: Typography.fontWeightMedium,
    },
    error: {
      fontSize: Typography.fontSizeXs,
      color: c.error,
      marginTop: Spacing.xs,
      marginLeft: 2,
    },
    hint: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginTop: Spacing.xs,
      marginLeft: 2,
    },
  });
}
