import type {
  VitalsLogEntry,
  BpThresholds,
  CareRoutine,
  HealthProfileType,
} from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  evaluateVitalReading,
  getVietnamDateOffsetStr,
  getVietnamDateStr,
  compareVitalsDesc,
} from '@/lib/config';
import {
  ALL_SLOTS,
  periodLabel,
  fmtDateShort,
  fmtDateFull,
  type DateRange,
  type VitalsSummaryStats,
  type VitalsComplianceStats,
} from './vitalsAnalyticsTypes';

export interface DoctorReportParams {
  dateRange: DateRange;
  patientName: string;
  patientDiagnosis?: string;
  profileType: HealthProfileType;
  bpThresholds: BpThresholds;
  normalizedVitals: VitalsLogEntry[];
  filteredLog: VitalsLogEntry[];
  careRoutines: CareRoutine[];
  summaryStats: VitalsSummaryStats;
  complianceStats: VitalsComplianceStats;
}

export function escapeHtml(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDateRangeText(dateRange: DateRange, forPrint = false): string {
  switch (dateRange) {
    case 'today':
      return 'Hôm nay';
    case '3d':
      return forPrint ? '3 ngày gần nhất' : '3 ngày qua';
    case '7d':
      return forPrint ? '7 ngày gần nhất' : '7 ngày qua';
    case '14d':
      return forPrint ? '14 ngày gần nhất' : '14 ngày qua';
    case '30d':
      return forPrint ? '30 ngày gần nhất' : '30 ngày qua';
    default:
      return 'Toàn bộ lịch sử';
  }
}

export function buildDoctorSummaryText(params: DoctorReportParams): string {
  const {
    dateRange,
    patientName,
    patientDiagnosis,
    profileType,
    normalizedVitals,
    filteredLog,
    careRoutines,
    summaryStats,
    complianceStats,
  } = params;

  const isPostStrokeProfile = profileType === 'post_stroke_cranioplasty';
  const rangeLabel = getDateRangeText(dateRange, false);
  const todayStr = getVietnamDateStr();
  const lines: string[] = [];

  lines.push(
    `🩺 BÁO CÁO THEO DÕI HUYẾT ÁP & SỨC KHỎE TẠI NHÀ - BỆNH NHÂN: ${patientName.toUpperCase()}`
  );
  lines.push(
    isPostStrokeProfile
      ? '📌 Bệnh cảnh: Sau mổ xuất huyết não, không liệt, tự đi lại & tập PHCN tại nhà, bán manh trái, đang chờ lịch mổ ghép sọ (6-8 tuần).'
      : `📌 Tình trạng theo dõi: ${patientDiagnosis || 'Theo dõi huyết áp, nhịp tim & sức khỏe định kỳ tại nhà'}.`
  );
  lines.push(`📅 Kỳ tổng hợp: ${rangeLabel} (Cập nhật ngày ${fmtDateFull(todayStr)})`);
  lines.push('--------------------');

  const periodEntries = filteredLog.length > 0 ? filteredLog : normalizedVitals;
  let sdSysVal: number | null = null;
  if (periodEntries.length >= 2 && summaryStats.avgSys !== null) {
    const mean = summaryStats.avgSys;
    const variance =
      periodEntries.reduce((s, e) => s + Math.pow(e.sys - mean, 2), 0) /
      (periodEntries.length - 1);
    sdSysVal = Math.round(Math.sqrt(variance) * 10) / 10;
  }

  lines.push(`1️⃣ CHỈ SỐ HUYẾT ÁP (${summaryStats.periodReadingsCount} lần đo):`);
  if (summaryStats.avgSys !== null) {
    lines.push(
      `• Trung bình kỳ: ${summaryStats.avgSys}/${summaryStats.avgDia} mmHg${
        sdSysVal !== null ? ` (Độ ổn định / chênh lệch +/-${sdSysVal} mmHg)` : ''
      }`
    );
    lines.push(
      `• Khoảng dao động: Số trên ${summaryStats.minSys}-${summaryStats.maxSys} mmHg | Số dưới ${summaryStats.minDia}-${summaryStats.maxDia} mmHg`
    );
    lines.push(
      `• Tỷ lệ đạt chuẩn an toàn: ${summaryStats.inRangePct}% (${summaryStats.inTargetBpCount}/${summaryStats.periodReadingsCount} lần đo đạt chuẩn)`
    );
    lines.push(
      `• Độ chênh 2 số TB: ${summaryStats.avgPP} mmHg (chuẩn 40-55) | Áp lực máu nuôi não TB: ${summaryStats.avgMAP} mmHg (chuẩn 75-95)`
    );
  }
  if (summaryStats.latest) {
    lines.push(
      `• Lần đo gần nhất: ${summaryStats.latest.sys}/${summaryStats.latest.dia} mmHg${
        summaryStats.latest.pulse ? ` - Mạch ${summaryStats.latest.pulse} bpm` : ''
      } (${fmtDateShort(summaryStats.latest.date)} ${summaryStats.latest.time})`
    );
  }

  const milestonesQuick = [
    { label: 'Hôm nay', cutoff: todayStr },
    { label: '3 ngày gần nhất', cutoff: getVietnamDateOffsetStr(-2) },
    { label: '7 ngày qua', cutoff: getVietnamDateOffsetStr(-6) },
    { label: '30 ngày qua', cutoff: getVietnamDateOffsetStr(-29) },
  ];
  lines.push('• Đối chiếu theo các mốc thời gian:');
  for (const mq of milestonesQuick) {
    const mItems = normalizedVitals.filter((v) => v.date >= mq.cutoff);
    if (mItems.length > 0) {
      const mSys = Math.round(mItems.reduce((s, x) => s + x.sys, 0) / mItems.length);
      const mDia = Math.round(mItems.reduce((s, x) => s + x.dia, 0) / mItems.length);
      const pItems = mItems.filter((x) => x.pulse && x.pulse > 0);
      const mPulse =
        pItems.length > 0
          ? Math.round(pItems.reduce((s, x) => s + (x.pulse || 0), 0) / pItems.length)
          : null;
      lines.push(
        `  - ${mq.label} (${mItems.length} lần): TB ${mSys}/${mDia} mmHg${
          mPulse ? ` · Mạch TB ${mPulse} bpm` : ''
        }`
      );
    }
  }

  lines.push('--------------------');
  lines.push('2️⃣ NHỊP TIM (MẠCH) & DIỄN BIẾN 4 BUỔI TRONG NGÀY:');
  if (summaryStats.avgPulse !== null) {
    lines.push(
      `• Nhịp tim TB: ${summaryStats.avgPulse} bpm (Thấp-Cao nhất: ${summaryStats.minPulse}-${summaryStats.maxPulse} bpm)`
    );
    if (summaryStats.slowPulseCount > 0) {
      lines.push(
        `  ⚠️ Lưu ý: Có ${summaryStats.slowPulseCount} lần đo nhịp tim dưới 60 bpm${
          summaryStats.verySlowPulseCount > 0
            ? ` (trong đó ${summaryStats.verySlowPulseCount} lần <50 bpm)`
            : ''
        } - cần báo Bác sĩ xem xét khi tái khám.`
      );
    }
    if (summaryStats.fastPulseCount > 0) {
      lines.push(`  ⚠️ Lưu ý: Có ${summaryStats.fastPulseCount} lần đo nhịp tim >= 100 bpm.`);
    }
  }
  ALL_SLOTS.forEach((slot) => {
    const p = summaryStats.byPeriod[slot];
    if (p.count > 0) {
      lines.push(
        `• ${periodLabel(slot)} (${p.count} lần): TB ${p.avgSys}/${p.avgDia} mmHg (Cao nhất ${p.maxSys})${
          p.avgPulse ? ` · Mạch TB ${p.avgPulse} bpm` : ''
        }`
      );
    }
  });
  if (
    summaryStats.byPeriod.morning.avgSys !== null &&
    summaryStats.byPeriod.evening.avgSys !== null
  ) {
    const meDiff = summaryStats.byPeriod.morning.avgSys - summaryStats.byPeriod.evening.avgSys;
    lines.push(
      `• So sánh Sáng - Tối: ${meDiff >= 0 ? `+${meDiff}` : meDiff} mmHg (${
        Math.abs(meDiff) <= 10
          ? 'Sáng và Tối cân bằng'
          : meDiff > 10
            ? 'Buổi Sáng thường cao hơn Tối'
            : 'Buổi Tối thường cao hơn Sáng'
      })`
    );
  }

  lines.push('--------------------');
  lines.push(
    `3️⃣ TUÂN THỦ THUỐC & PHỤC HỒI CHỨC NĂNG (${complianceStats.activeDaysCount} ngày ghi sổ từ ${fmtDateShort(
      complianceStats.firstTrackedDate
    )}):`
  );
  if (complianceStats.medsPercentage !== null) {
    lines.push(
      `• Uống thuốc định kỳ: Đạt ${complianceStats.medsPercentage}% (${complianceStats.totalDoneDoses}/${complianceStats.totalExpectedDoses} cữ - ${complianceStats.daysFullMeds}/${complianceStats.activeDaysCount} ngày uống đủ 100%)`
    );
  }
  if (complianceStats.totalExpectedRehab > 0) {
    lines.push(
      `• Tập Phục hồi chức năng: Đạt ${complianceStats.rehabPercentage}% (${complianceStats.totalDoneRehab}/${complianceStats.totalExpectedRehab} buổi tập)`
    );
  }
  if (complianceStats.asNeededUsedCount > 0) {
    lines.push(`• Thuốc uống khi cần: Đã dùng ${complianceStats.asNeededUsedCount} lần`);
  }

  const activeMedsList = careRoutines.filter(
    (r) => r.isActive && r.category === 'meds' && r.medType !== 'as_needed'
  );
  if (activeMedsList.length > 0) {
    lines.push('• Danh mục thuốc định kỳ đang uống:');
    for (const m of activeMedsList) {
      const slotLabels = (m.timeSlots || []).map((s) => TIME_SLOT_CONFIG[s]?.label || s).join(', ');
      lines.push(`  - ${m.title} (${m.dosage}) - Khung giờ: ${slotLabels}`);
    }
  }

  const notedEntriesInPeriod = [...periodEntries]
    .filter((e) => Boolean(e.note && e.note.trim()))
    .sort(compareVitalsDesc)
    .slice(0, 8);
  if (notedEntriesInPeriod.length > 0) {
    lines.push('--------------------');
    lines.push(
      isPostStrokeProfile
        ? '4️⃣ GHI CHÚ TRIỆU CHỨNG & VÙNG KHUYẾT SỌ TRONG KỲ:'
        : '4️⃣ GHI CHÚ TRIỆU CHỨNG & TÌNH TRẠNG SỨC KHỎE TRONG KỲ:'
    );
    for (const ne of notedEntriesInPeriod) {
      lines.push(
        `• ${fmtDateShort(ne.date)} ${ne.time} (${ne.sys}/${ne.dia} mmHg${
          ne.pulse ? ` - Mạch ${ne.pulse}` : ''
        }): ${ne.note}`
      );
    }
  }

  lines.push('--------------------');
  lines.push(`💡 Trích xuất tự động từ Sổ Sức Khỏe Gia Đình (${patientName}).`);
  return lines.join('\n');
}

export function openPrintDoctorReportWindow(
  params: DoctorReportParams,
  showToast?: (msg: string, type?: 'info' | 'success' | 'warn') => void
): void {
  if (typeof window === 'undefined') return;
  const {
    dateRange,
    patientName,
    patientDiagnosis,
    profileType,
    bpThresholds,
    normalizedVitals,
    filteredLog,
    careRoutines,
    summaryStats,
    complianceStats,
  } = params;

  const safePatientName = escapeHtml(patientName);
  const safePatientDiagnosis = escapeHtml(
    patientDiagnosis || 'Theo dõi huyết áp, nhịp tim và chăm sóc sức khỏe định kỳ tại nhà.'
  );
  const safeRangeLabel = escapeHtml(getDateRangeText(dateRange, true));
  const safeTodayFull = escapeHtml(fmtDateFull(getVietnamDateStr()));

  const periodEntries = [...(filteredLog.length > 0 ? filteredLog : normalizedVitals)].sort(
    compareVitalsDesc
  );
  const activeMedsList = careRoutines.filter(
    (r) => r.isActive && r.category === 'meds' && r.medType !== 'as_needed'
  );
  const notedEntries = periodEntries.filter((e) => Boolean(e.note && e.note.trim()));

  const slotRowsHtml = ALL_SLOTS.map((slot) => {
    const st = summaryStats.byPeriod[slot];
    const cfg = TIME_SLOT_CONFIG[slot];
    const safeSlotLabel = escapeHtml(cfg.label);
    if (!st || st.count === 0) {
      return `<tr><td><strong>${safeSlotLabel}</strong></td><td colspan="3" style="color:#475569">Chưa có bản ghi</td></tr>`;
    }
    return `<tr>
      <td><strong>${safeSlotLabel}</strong> (${st.count} lần)</td>
      <td><strong>${st.avgSys}/${st.avgDia}</strong> mmHg</td>
      <td>${st.maxSys} mmHg</td>
      <td>${st.avgPulse ? `${st.avgPulse} l/p` : '-'}</td>
    </tr>`;
  }).join('');

  const medsRowsHtml =
    activeMedsList.length > 0
      ? activeMedsList
          .map((m) => {
            const slots = (m.timeSlots || [])
              .map((s) => TIME_SLOT_CONFIG[s]?.label || s)
              .join(', ');
            return `<tr><td><strong>${escapeHtml(m.title)}</strong></td><td>${escapeHtml(
              m.dosage
            )}</td><td>${escapeHtml(slots)}</td></tr>`;
          })
          .join('')
      : `<tr><td colspan="3" style="color:#475569">Chưa cài đặt danh mục thuốc định kỳ</td></tr>`;

  const logRowsHtml = periodEntries
    .slice(0, 35)
    .map((v) => {
      const pp = v.sys - v.dia;
      const map = Math.round(v.dia + pp / 3);
      const evalItem = evaluateVitalReading(v, bpThresholds);
      const safeDate = escapeHtml(fmtDateShort(v.date));
      const safeTime = escapeHtml(v.time);
      const safePeriod = escapeHtml(periodLabel(v.period).replace(/^[^\s]+\s/, ''));
      const safeBadge = escapeHtml(evalItem.badgeText);
      const safeNote = v.note ? escapeHtml(v.note) : '';
      return `<tr>
        <td>${safeDate} ${safeTime}</td>
        <td>${safePeriod}</td>
        <td><strong>${v.sys}/${v.dia}</strong></td>
        <td>${v.pulse ? `<strong>${v.pulse}</strong>` : '-'}</td>
        <td>${map} / ${pp}</td>
        <td>${safeBadge}${safeNote ? ` - <em>${safeNote}</em>` : ''}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Phiếu Tóm Tắt Chỉ Số Trình Bác Sĩ - ${safePatientName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { margin: 0; padding: 0; color: #0f172a; font-size: 12px; line-height: 1.45; }
    .header { border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 17px; font-weight: 800; color: #0f766e; text-transform: uppercase; margin: 0 0 3px 0; }
    .subtitle { font-size: 12px; font-weight: 700; color: #1e293b; margin: 0; }
    .context-box { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; font-size: 11.5px; }
    .alert-box { background: #fffbeb; border: 1.5px solid #f59e0b; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; font-size: 11.5px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
    .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px 9px; background: #f8fafc; }
    .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; }
    .card-val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .card-sub { font-size: 10.5px; color: #475569; margin-top: 2px; }
    h3 { font-size: 12.5px; font-weight: 800; text-transform: uppercase; color: #0f766e; margin: 10px 0 5px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11.2px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
    th { background: #f1f5f9; font-weight: 800; color: #1e293b; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <p class="title">PHIẾU TÓM TẮT THEO DÕI HUYẾT ÁP &amp; SINH HIỆU TẠI NHÀ</p>
      <p class="subtitle">Bệnh nhân: ${safePatientName} • Kỳ báo cáo: ${safeRangeLabel} (${summaryStats.periodReadingsCount} lần đo)</p>
    </div>
    <div style="text-align:right;font-size:11px;color:#475569;">
      <div>Ngày trích xuất: <strong>${safeTodayFull}</strong></div>
      <div>Ngưỡng mục tiêu cài đặt: &lt;${bpThresholds.highSys}/${bpThresholds.highDia} mmHg</div>
    </div>
  </div>
  <div class="context-box">
    <strong>🩺 Tóm tắt bệnh cảnh hiện tại trình Bác sĩ:</strong> ${
      profileType === 'post_stroke_cranioplasty'
        ? 'Sau phẫu thuật xuất huyết não • Hiện không liệt vận động, tự đi lại và tập phục hồi chức năng tại nhà • Di chứng bán manh đồng danh bên trái • Đang theo dõi ngoại trú chờ lịch phẫu thuật ghép sọ (6-8 tuần).'
        : safePatientDiagnosis
    }
  </div>
  ${
    summaryStats.slowPulseCount > 0 || summaryStats.warningCount > 0 || summaryStats.criticalCount > 0 || notedEntries.length > 0
      ? `<div class="alert-box">
          <strong>⚠️ Điểm lưu ý lâm sàng cần xin ý kiến Bác sĩ:</strong>
          <ul style="margin:4px 0 0 18px;padding:0;">
            ${
              summaryStats.slowPulseCount > 0
                ? `<li><strong>Nhịp tim chậm (&lt; 60 lần/phút):</strong> Ghi nhận <strong>${summaryStats.slowPulseCount}/${summaryStats.periodReadingsCount} lần đo</strong> có mạch &lt; 60 l/p${
                    summaryStats.verySlowPulseCount > 0
                      ? ` (trong đó <strong>${summaryStats.verySlowPulseCount} lần &lt; 50 l/p</strong>)`
                      : ''
                  }, thấp nhất <strong>${summaryStats.minPulse} l/p</strong>.</li>`
                : ''
            }
            ${
              summaryStats.warningCount + summaryStats.criticalCount > 0
                ? `<li><strong>Dao động huyết áp:</strong> Có <strong>${
                    summaryStats.warningCount + summaryStats.criticalCount
                  } lần</strong> vượt ngưỡng an toàn (Cao nhất: <strong>${summaryStats.maxSys}/${summaryStats.maxDia} mmHg</strong>).</li>`
                : ''
            }
            ${
              notedEntries.length > 0
                ? `<li><strong>Ghi chú triệu chứng trong kỳ (${notedEntries.length} lần):</strong> ${notedEntries
                    .slice(0, 5)
                    .map(
                      (n) =>
                        `${escapeHtml(fmtDateShort(n.date))} ${escapeHtml(n.time)}: &quot;${escapeHtml(
                          n.note
                        )}&quot;`
                    )
                    .join(' | ')}</li>`
                : ''
            }
          </ul>
        </div>`
      : ''
  }
  <div class="grid-4">
    <div class="card">
      <div class="card-label">1. Huyết áp Trung bình</div>
      <div class="card-val">${summaryStats.avgSys ?? '-'}/${summaryStats.avgDia ?? '-'} <small style="font-size:11px;font-weight:600">mmHg</small></div>
      <div class="card-sub">Thấp-Cao: ${summaryStats.minSys ?? '-'}-${summaryStats.maxSys ?? '-'} / ${summaryStats.minDia ?? '-'}-${summaryStats.maxDia ?? '-'}</div>
    </div>
    <div class="card">
      <div class="card-label">2. Tỷ lệ đạt chuẩn</div>
      <div class="card-val">${summaryStats.inRangePct}%</div>
      <div class="card-sub">Đạt chuẩn ${summaryStats.inTargetBpCount}/${summaryStats.periodReadingsCount} lần đo</div>
    </div>
    <div class="card">
      <div class="card-label">3. Áp lực tưới máu não (MAP)</div>
      <div class="card-val">${summaryStats.avgMAP ?? '-'} <small style="font-size:11px;font-weight:600">mmHg</small></div>
      <div class="card-sub">Hiệu áp (PP) TB: ${summaryStats.avgPP ?? '-'} mmHg</div>
    </div>
    <div class="card">
      <div class="card-label">4. Nhịp tim (Mạch) TB</div>
      <div class="card-val">${summaryStats.avgPulse ?? '-'} <small style="font-size:11px;font-weight:600">lần/phút</small></div>
      <div class="card-sub">Biên độ: ${summaryStats.minPulse ?? '-'}-${summaryStats.maxPulse ?? '-'} l/p (${summaryStats.slowPulseCount} lần &lt;60)</div>
    </div>
  </div>
  <div class="two-col">
    <div>
      <h3>I. Trung bình theo 4 buổi trong ngày</h3>
      <table><thead><tr><th>Buổi</th><th>HA Trung bình</th><th>SYS Cao nhất</th><th>Mạch TB</th></tr></thead><tbody>${slotRowsHtml}</tbody></table>
    </div>
    <div>
      <h3>II. Đơn thuốc định kỳ đang uống (${complianceStats.medsPercentage !== null ? `Tuân thủ ${complianceStats.medsPercentage}%` : 'Tại nhà'})</h3>
      <table><thead><tr><th>Tên thuốc</th><th>Liều dùng</th><th>Buổi uống</th></tr></thead><tbody>${medsRowsHtml}</tbody></table>
    </div>
  </div>
  <h3>III. Bảng nhật ký chi tiết các lần đo (${Math.min(periodEntries.length, 35)} lần đo gần nhất trong kỳ)</h3>
  <table>
    <thead><tr><th>Ngày &amp; Giờ</th><th>Buổi</th><th>Huyết áp (mmHg)</th><th>Mạch (l/p)</th><th>MAP / PP</th><th>Đánh giá &amp; Ghi chú triệu chứng</th></tr></thead>
    <tbody>${logRowsHtml}</tbody>
  </table>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    showToast?.(
      'Trình duyệt đang chặn cửa sổ bật lên. Hãy cho phép mở cửa sổ để in hoặc lưu PDF.',
      'warn'
    );
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
