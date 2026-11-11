'use client';

import React from 'react';
import { MedicalRecordsContainer } from './medical-records/MedicalRecordsContainer';
import type { LabResultsViewProps } from './medical-records/labRecordsUtils';

export type { LabResultsViewProps };

export function LabResultsView(props: LabResultsViewProps) {
  return <MedicalRecordsContainer {...props} />;
}

export default LabResultsView;
