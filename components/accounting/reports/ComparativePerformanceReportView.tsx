import { useTheme } from '@/context/theme';
import { useMemo } from 'react';
import { Text } from 'react-native';
import { ComparativeSummaryCard } from './comparative/ComparativeSummaryCard';
import { ComparativeTable } from './comparative/ComparativeTable';
import { mapPeriods, mapRows } from './comparative/mappers';
import { ComparativeReportShape } from './comparative/types';
import { makeReportStyles } from './shared-styles';

type Props = { report: any };

export function ComparativePerformanceReportView({ report }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeReportStyles(colors), [colors]);

  const safeReport = (report ?? {}) as ComparativeReportShape;
  const periods = useMemo(() => mapPeriods(safeReport), [safeReport]);
  const rows = useMemo(() => mapRows(safeReport), [safeReport]);

  if (!periods.length || !rows.length) {
    return <Text style={styles.emptyText}>No comparative performance data available.</Text>;
  }

  return (
    <>
      <ComparativeTable periods={periods} rows={rows} styles={styles} />
      <ComparativeSummaryCard report={safeReport} styles={styles} />
    </>
  );
}
