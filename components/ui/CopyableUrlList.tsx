import { AppColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMemo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type UrlItems = Record<string, unknown>;

type CopyableUrlListProps = {
  title?: string;
  items: UrlItems;
};

export function CopyableUrlList({ title = 'URLs', items }: CopyableUrlListProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const entries = useMemo(() => Object.entries(items ?? {}), [items]);

  async function copyValue(label: string, value: string) {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  }

  if (entries.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {entries.map(([key, value]) => {
        const rendered = String(value ?? '');
        return (
          <View key={key} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.key}>{key}</Text>
              <Text selectable style={styles.value}>{rendered}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => copyValue(key, rendered)}
              hitSlop={8}
              activeOpacity={0.8}
            >
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.sm,
      marginBottom: Spacing.md,
    },
    title: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: Spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.xs,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    rowMain: {
      flex: 1,
    },
    key: {
      fontSize: Typography.fontSizeXs,
      color: c.textMuted,
      marginBottom: 2,
      textTransform: 'capitalize',
    },
    value: {
      fontSize: Typography.fontSizeSm,
      color: c.textSecondary,
    },
    copyBtn: {
      width: 30,
      height: 30,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.inputBackground,
    },
  });
}
