'use client';

import React from 'react';
import { VitalsAnalyticsContainer } from './vitals-analytics/VitalsAnalyticsContainer';
import type { VitalsChartViewProps } from './vitals-analytics/vitalsAnalyticsTypes';

export type { VitalsChartViewProps };

export function VitalsChartView(props: VitalsChartViewProps) {
  return <VitalsAnalyticsContainer {...props} />;
}

export default VitalsChartView;
