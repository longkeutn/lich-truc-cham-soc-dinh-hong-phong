import type { LabChartPoint } from './labRecordsUtils';

export function formatLipidTooltip(value: unknown, name: unknown, item: unknown) {
  const entry = item as { payload?: LabChartPoint; dataKey?: string };
  const pt = entry?.payload;
  if (pt?.lipidUnit === 'mg/dL' && entry?.dataKey) {
    const rawVal = pt[`${entry.dataKey}Raw` as keyof LabChartPoint];
    if (rawVal !== undefined) {
      return [`${value} mmol/L (Gốc trên phiếu: ${rawVal} mg/dL)`, String(name ?? '')];
    }
  }
  return [`${value} mmol/L`, String(name ?? '')];
}

export function formatMetabolicTooltip(value: unknown, name: unknown, item: unknown) {
  const entry = item as { payload?: LabChartPoint; dataKey?: string };
  const pt = entry?.payload;
  if (entry?.dataKey === 'glucose') {
    if (pt?.glucoseUnit === 'mg/dL' && pt?.glucoseRaw !== undefined) {
      return [`${value} mmol/L (Gốc trên phiếu: ${pt.glucoseRaw} mg/dL)`, String(name ?? '')];
    }
    return [`${value} mmol/L`, String(name ?? '')];
  }
  if (entry?.dataKey === 'calcium') {
    if (pt?.calciumUnit === 'mg/dL' && pt?.calciumRaw !== undefined) {
      return [`${value} mmol/L (Gốc trên phiếu: ${pt.calciumRaw} mg/dL)`, String(name ?? '')];
    }
    return [`${value} mmol/L`, String(name ?? '')];
  }
  if (entry?.dataKey === 'phosphorus') {
    if (pt?.phosphorusUnit === 'mg/dL' && pt?.phosphorusRaw !== undefined) {
      return [`${value} mmol/L (Gốc trên phiếu: ${pt.phosphorusRaw} mg/dL)`, String(name ?? '')];
    }
    return [`${value} mmol/L`, String(name ?? '')];
  }
  if (entry?.dataKey === 'pth') {
    if (pt?.pthUnit === 'pmol/L' && pt?.pthRaw !== undefined) {
      return [`${value} pg/mL (Gốc trên phiếu: ${pt.pthRaw} pmol/L)`, String(name ?? '')];
    }
    return [`${value} pg/mL`, String(name ?? '')];
  }
  if (entry?.dataKey === 'albumin') {
    if (pt?.albuminUnit === 'g/dL' && pt?.albuminRaw !== undefined) {
      return [`${value} g/L (Gốc trên phiếu: ${pt.albuminRaw} g/dL)`, String(name ?? '')];
    }
    return [`${value} g/L`, String(name ?? '')];
  }
  if (entry?.dataKey === 'hba1c') return [`${value}%`, String(name ?? '')];
  if (entry?.dataKey === 'vitaminD') return [`${value} ng/mL`, String(name ?? '')];
  return [String(value ?? ''), String(name ?? '')];
}

export function formatLiverKidneyTooltip(value: unknown, name: unknown, item: unknown) {
  const entry = item as { payload?: LabChartPoint; dataKey?: string };
  if (entry?.dataKey === 'ast' || entry?.dataKey === 'alt') return [`${value} U/L`, String(name ?? '')];
  if (entry?.dataKey === 'creatinine') return [`${value} µmol/L`, String(name ?? '')];
  return [String(value ?? ''), String(name ?? '')];
}
