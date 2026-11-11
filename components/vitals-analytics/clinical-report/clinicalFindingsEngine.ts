import type { BpThresholds } from '@/lib/types';
import { classifyClinicalBp } from '@/lib/config';
import type { TimeframeMetrics, CircadianAnalysisResult } from './clinicalReportStats';

export interface ClinicalFindingItem {
  level: 'good' | 'caution' | 'alert';
  title: string;
  detail: string;
}

export function computeClinicalFindings(
  activeMilestone: TimeframeMetrics,
  bpThresholds: BpThresholds,
  circadianAnalysis: CircadianAnalysisResult,
  subjectLabel: string
): ClinicalFindingItem[] {
  const findings: ClinicalFindingItem[] = [];
  if (activeMilestone.count === 0 || activeMilestone.avgSys === null || activeMilestone.avgDia === null) {
    return findings;
  }

  const bpClass = classifyClinicalBp(activeMilestone.avgSys, activeMilestone.avgDia, bpThresholds, subjectLabel);
  const deltaNote =
    activeMilestone.deltaSysVsPrev !== null && activeMilestone.deltaDiaVsPrev !== null
      ? ` So với kỳ liền trước, huyết áp trung bình ${
          Math.abs(activeMilestone.deltaSysVsPrev) <= 4
            ? 'giữ nguyên ổn định'
            : activeMilestone.deltaSysVsPrev > 4
            ? `tăng nhẹ +${activeMilestone.deltaSysVsPrev} mmHg`
            : `giảm ${activeMilestone.deltaSysVsPrev} mmHg`
        }.`
      : '';

  findings.push({
    level:
      bpClass.category === 'optimal' || bpClass.category === 'normal_high'
        ? 'good'
        : bpClass.category === 'stage2' || bpClass.category === 'low'
        ? 'alert'
        : 'caution',
    title: `Huyết áp trung bình (${activeMilestone.label}): ${activeMilestone.avgSys}/${activeMilestone.avgDia} mmHg - ${bpClass.shortLabel}`,
    detail: `${bpClass.clinicalNote} Có ${activeMilestone.tirPct}% số lần đo nằm trong vùng chuẩn an toàn.${deltaNote}`,
  });

  if (activeMilestone.sdSys !== null && activeMilestone.count >= 2) {
    const rangeSpan = (activeMilestone.maxSys || 0) - (activeMilestone.minSys || 0);
    if (activeMilestone.sdSys < 10) {
      findings.push({
        level: 'good',
        title: `Độ ổn định rất tốt: Huyết áp giữ phẳng êm (chênh lệch chỉ ±${activeMilestone.sdSys} mmHg)`,
        detail: `Số trên thấp nhất là ${activeMilestone.minSys} và cao nhất là ${activeMilestone.maxSys} mmHg. Các lần đo ít bị nhảy vọt bất ngờ, rất tốt để bảo vệ mạch máu não.`,
      });
    } else if (activeMilestone.sdSys < 15) {
      findings.push({
        level: 'caution',
        title: `Huyết áp có dao động nhẹ giữa các lần đo (chênh lệch ±${activeMilestone.sdSys} mmHg)`,
        detail: `Số trên dao động từ ${activeMilestone.minSys} đến ${activeMilestone.maxSys} mmHg (cách nhau ${rangeSpan} mmHg). Gia đình nên cho ${subjectLabel} uống thuốc đúng một khung giờ cố định mỗi ngày và nghỉ 10 phút trước khi đo.`,
      });
    } else {
      findings.push({
        level: 'alert',
        title: `Huyết áp lên xuống khá thất thường (chênh lệch ±${activeMilestone.sdSys} mmHg)`,
        detail: `Số trên lúc thấp nhất ${activeMilestone.minSys} mmHg nhưng lúc cao nhất lên tới ${activeMilestone.maxSys} mmHg. Khi đi tái khám nên đưa bảng này cho Bác sĩ xem để chỉnh lại liều thuốc giữ huyết áp đều hơn.`,
      });
    }
  }

  if (activeMilestone.avgPulse !== null) {
    if (activeMilestone.verySlowPulseCount > 0) {
      findings.push({
        level: 'alert',
        title: `Lưu ý Nhịp tim rất chậm: Có ${activeMilestone.verySlowPulseCount} lần mạch dưới 50 nhịp/phút (Thấp nhất ${activeMilestone.minPulse} bpm)`,
        detail: `Nhịp tim trung bình là ${activeMilestone.avgPulse} nhịp/phút (tổng cộng ${activeMilestone.slowPulseCount} lần dưới 60). Cần hỏi Bác sĩ xem trong đơn thuốc có loại nào làm chậm nhịp tim không.`,
      });
    } else if (activeMilestone.slowPulseCount > 0) {
      findings.push({
        level: 'caution',
        title: `Nhịp tim trung bình ${activeMilestone.avgPulse} nhịp/phút - Có ${activeMilestone.slowPulseCount} lần mạch hơi chậm (50-59 nhịp/phút)`,
        detail: `Mạch thấp nhất ghi nhận là ${activeMilestone.minPulse} nhịp/phút${
          circadianAnalysis.lowestPulseSlot ? ` (thường vào buổi ${circadianAnalysis.lowestPulseSlot.label})` : ''
        }. Nếu ${subjectLabel} không bị mệt hay chóng mặt thì chỉ cần đỡ ${subjectLabel} ngồi dậy từ từ và báo Bác sĩ biết khi tái khám định kỳ.`,
      });
    } else if (activeMilestone.fastPulseCount > 0) {
      findings.push({
        level: 'caution',
        title: `Nhịp tim trung bình ${activeMilestone.avgPulse} nhịp/phút - Có ${activeMilestone.fastPulseCount} lần mạch đập nhanh (>=100 nhịp/phút)`,
        detail: `Mạch cao nhất là ${activeMilestone.maxPulse} nhịp/phút. Khi thấy mạch nhanh nên kiểm tra xem ${subjectLabel} có vừa tập vận động, bị đau mỏi, sốt hay uống thiếu nước không.`,
      });
    } else {
      findings.push({
        level: 'good',
        title: `Nhịp tim (Mạch) đập đều và tốt: Trung bình ${activeMilestone.avgPulse} nhịp/phút (${activeMilestone.minPulse}-${activeMilestone.maxPulse} bpm)`,
        detail: `Tất cả các lần đo nhịp tim đều nằm trong khoảng an toàn (60-99 nhịp/phút), tim của ${subjectLabel} làm việc nhẹ nhàng, không bị quá sức.`,
      });
    }
  }

  if (circadianAnalysis.circadianPattern.type !== 'unknown') {
    findings.push({
      level: circadianAnalysis.circadianPattern.type === 'balanced' ? 'good' : 'caution',
      title: `So sánh Sáng & Tối: ${circadianAnalysis.circadianPattern.title}`,
      detail: circadianAnalysis.circadianPattern.explanation,
    });
  } else if (activeMilestone.avgPP !== null && activeMilestone.avgMAP !== null) {
    const ppText =
      activeMilestone.avgPP >= 60
        ? `Khoảng cách giữa số trên và số dưới trung bình hơi rộng (${activeMilestone.avgPP} mmHg, thường gặp ở người lớn tuổi có thành mạch hơi cứng).`
        : activeMilestone.avgPP < 35
        ? `Khoảng cách giữa số trên và số dưới hơi hẹp (${activeMilestone.avgPP} mmHg), nên chú ý cho ${subjectLabel} uống đủ nước ấm trong ngày.`
        : `Khoảng cách giữa số trên và số dưới đạt mức đẹp (${activeMilestone.avgPP} mmHg, chuẩn 40-55 mmHg).`;
    findings.push({
      level: activeMilestone.avgPP > 65 || activeMilestone.avgMAP < 70 ? 'caution' : 'good',
      title: `Sức đẩy máu nuôi não & Độ chênh 2 số đạt mức ${
        activeMilestone.avgMAP >= 70 && activeMilestone.avgMAP <= 105 ? 'an toàn' : 'cần lưu ý'
      }`,
      detail: `${ppText} Áp lực đẩy máu lên nuôi não trung bình đạt ${activeMilestone.avgMAP} mmHg (chuẩn an toàn 75-95 mmHg).`,
    });
  }

  return findings;
}
