import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type OperationResponseModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  response?: unknown;
  onClose: () => void;
};

function stringifyResponse(response: unknown): string {
  if (response == null) return '';
  if (typeof response === 'string') return response;
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      response,
      (_key, value) => {
        if (typeof value === 'function') {
          return `[Function${value.name ? `: ${value.name}` : ''}]`;
        }

        if (typeof value === 'object' && value !== null) {
          if (typeof window !== 'undefined' && value === window) {
            return '[Window]';
          }

          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack,
            };
          }

          if (seen.has(value)) {
            return '[Circular]';
          }

          seen.add(value);
        }

        return value;
      },
      2,
    );
  } catch {
    try {
      return String(response);
    } catch {
      return '[Unserializable response]';
    }
  }
}

export function OperationResponseModal({
  visible,
  title,
  message,
  response,
  onClose,
}: OperationResponseModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const renderedResponse = stringifyResponse(response);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {renderedResponse ? (
            <View style={styles.responseCard}>
              <Text selectable style={styles.responseText}>{renderedResponse}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No additional response details.</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
      maxHeight: '82%',
      backgroundColor: c.surface,
      borderTopLeftRadius: Radius.lg,
      borderTopRightRadius: Radius.lg,
      paddingTop: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      ...Shadow.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    title: {
      flex: 1,
      marginRight: Spacing.sm,
      color: c.text,
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
    },
    content: { paddingBottom: Spacing.xl },
    message: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeSm,
      marginBottom: Spacing.sm,
    },
    responseCard: {
      backgroundColor: c.inputBackground,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.sm,
    },
    responseText: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
      lineHeight: 18,
      fontFamily: 'monospace',
    },
    emptyText: {
      color: c.textMuted,
      fontSize: Typography.fontSizeSm,
    },
  });
}
