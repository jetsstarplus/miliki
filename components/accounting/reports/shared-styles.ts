import { AppColors, Radius, Spacing, Typography } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export function makeReportStyles(c: AppColors) {
  return StyleSheet.create({
    sectionTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      marginTop: Spacing.sm,
      marginBottom: 6,
    },
    rowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    rowTextWrap: {
      flex: 1,
    },
    rowLabel: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
    },
    rowExtra: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginTop: 2,
    },
    rowValue: {
      color: c.primary,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
    },
    summaryCard: {
      marginTop: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.sm,
      backgroundColor: c.inputBackground,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
    },
    summaryText: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginBottom: 2,
    },
    emptyText: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
      marginTop: Spacing.xs,
    },
    tableScroll: {
      marginTop: Spacing.sm,
    },
    table: {
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.sm,
      overflow: 'hidden',
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: c.inputBackground,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    tableHeaderCellMain: {
      width: 200,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
    },
    tableHeaderCell: {
      width: 120,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
      borderLeftWidth: 1,
      borderLeftColor: c.borderLight,
    },
    tableHeaderText: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    tableCellMain: {
      width: 200,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
    },
    tableCell: {
      width: 120,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
      borderLeftWidth: 1,
      borderLeftColor: c.borderLight,
      alignItems: 'flex-end',
    },
    tableMainText: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
    tableSubText: {
      color: c.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    tableValueText: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
    },
  });
}
