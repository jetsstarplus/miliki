export type ComparativePeriod = {
  label: string;
};

export type ComparativeRow = {
  key: string;
  label: string;
  subLabel?: string;
  values: number[];
};

export type ComparativeReportShape = {
  periods?: any[];
  totals_rows?: any[];
  account_rows?: any[];
  frequency?: any;
  mode?: any;
  count?: any;
};
