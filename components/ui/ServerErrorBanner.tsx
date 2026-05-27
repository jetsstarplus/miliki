import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html/lib/commonjs/RenderHTML';
import { Radius, Spacing, Typography } from '../../constants/theme';

export function ServerErrorBanner({ message }: { message: string }) {
  const { width } = useWindowDimensions();
  if (!message) return null;

  const trimmed = message.trim();
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);

  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
      <View style={styles.contentWrap}>
        {hasHtml ? (
          <RenderHTML
            contentWidth={Math.max(0, width - 120)}
            source={{ html: trimmed }}
            baseStyle={styles.text}
            tagsStyles={htmlTagsStyles}
          />
        ) : (
          <Text style={styles.text}>{message}</Text>
        )}
      </View>
    </View>
  );
}

const htmlTagsStyles = {
  p: {
    marginTop: 0,
    marginBottom: 6,
  },
  ul: {
    marginTop: 0,
    marginBottom: 6,
    paddingLeft: 16,
  },
  ol: {
    marginTop: 0,
    marginBottom: 6,
    paddingLeft: 16,
  },
  li: {
    marginBottom: 4,
  },
  strong: {
    fontWeight: '700' as const,
  },
  a: {
    color: '#B91C1C',
    textDecorationLine: 'underline' as const,
  },
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  contentWrap: {
    flex: 1,
    minWidth: 0,
  },
  text: { flex: 1, fontSize: Typography.fontSizeSm, color: '#EF4444' },
});
