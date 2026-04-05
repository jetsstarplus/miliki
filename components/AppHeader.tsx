import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppColors, Spacing, Typography } from '../constants/theme';
import { useDrawer } from '../context/drawer';
import { useTheme } from '../context/theme';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export function AppHeader({ title, showBack = false, rightElement }: AppHeaderProps) {
  const { toggle } = useDrawer();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={showBack ? () => router.back() : toggle}
        style={styles.leftBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={showBack ? 'arrow-back' : 'menu'}
          size={24}
          color={colors.text}
        />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <View style={styles.rightSlot}>
        {rightElement ?? <View style={{ width: 40 }} />}
      </View>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
      minHeight: 52,
    },
    leftBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    rightSlot: {
      width: 40,
      alignItems: 'flex-end',
    },
  });
}
