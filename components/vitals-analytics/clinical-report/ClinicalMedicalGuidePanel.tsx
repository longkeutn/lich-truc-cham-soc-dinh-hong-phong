'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { BpThresholds, HealthProfileType } from '@/lib/types';

interface ClinicalMedicalGuidePanelProps {
  profileType: HealthProfileType;
  patientName: string;
  subjectLabel: string;
  bpThresholds: BpThresholds;
  onClose: () => void;
}

export default function ClinicalMedicalGuidePanel({
  profileType,
  patientName,
  subjectLabel,
  bpThresholds,
  onClose,
}: ClinicalMedicalGuidePanelProps) {
  const isPostStrokeProfile = profileType === 'post_stroke_cranioplasty';

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50/70 border-2 border-teal-300 text-xs text-slate-800 space-y-4 leading-relaxed shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-teal-200 pb-2.5">
        <div>
          <h4 className="text-sm sm:text-base font-black text-teal-950">
            {isPostStrokeProfile
              ? '📖 Cẩm Nang Hiểu Đúng Chỉ Số Huyết Áp & Các Triệu Chứng Đáng Lo Của Bố'
              : `📖 Cẩm Nang Hiểu Đúng Chỉ Số Huyết Áp & Dấu Hiệu Tim Mạch (${patientName})`}
          </h4>
          <p className="text-xs text-teal-800 font-medium">
            {isPostStrokeProfile
              ? 'Biên soạn theo bệnh cảnh của Bố: sau mổ xuất huyết não, đang tập phục hồi tại nhà, bán manh trái, chờ ghép sọ'
              : `Hướng dẫn đọc hiểu chỉ số huyết áp, nhịp mạch và các dấu hiệu cảnh báo tim mạch tại nhà cho ${patientName}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-teal-100 text-teal-900 border border-teal-300 font-extrabold cursor-pointer shrink-0"
        >
          Thu gọn ✕
        </button>
      </div>

      {/* PHẦN 1: GIẢI THÍCH CHỈ SỐ HUYẾT ÁP & MẠCH */}
      <div className="space-y-2.5">
        <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-teal-800 text-white text-[11px]">PHẦN 1</span>
          <span>Ý nghĩa từng chỉ số &amp; ảnh hưởng tới mạch máu não của {subjectLabel}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-white border border-rose-200 space-y-1.5">
            <div className="font-black text-rose-900 text-xs sm:text-sm flex items-center justify-between gap-1 flex-wrap">
              <span>1. SỐ TRÊN - Huyết áp Tâm thu (SYS)</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                Đẹp: 115-130 (An toàn &lt;{bpThresholds.highSys})
              </span>
            </div>
            <p className="text-slate-700">
              • <strong>Là gì:</strong> Áp lực máu bơm căng lên thành mạch <strong>lúc tim đang co bóp đẩy máu lên nuôi não</strong>. Đây là con số quan trọng số 1 đối với {subjectLabel}.
            </p>
            <p className="text-rose-900 bg-rose-50/70 p-2 rounded-lg border border-rose-100">
              • <strong>Nếu quá cao (&ge;{bpThresholds.highSys}, nguy hiểm khi &ge;160 mmHg):</strong> Lực máu dội lên mạch máu não quá mạnh. {isPostStrokeProfile ? 'Vì mạch máu não của Bố từng tổn thương sau tai biến, áp lực cao dễ gây đau căng đầu, đỏ mặt và ' : 'Áp lực cao kéo dài dễ gây đau căng đầu, đỏ mặt và '}<strong>nguy cơ tai biến mạch máu não</strong>.
            </p>
            <p className="text-sky-900 bg-sky-50/70 p-2 rounded-lg border border-sky-100">
              • <strong>Nếu quá thấp (&le;{bpThresholds.lowSys}, nguy hiểm khi &lt;90 mmHg):</strong> Lực bơm yếu không đẩy đủ máu lên não, gây <strong>thiếu máu não tạm thời</strong> làm {subjectLabel} hoa mắt, lả người hoặc khuỵu ngã khi ngồi dậy.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-blue-200 space-y-1.5">
            <div className="font-black text-blue-900 text-xs sm:text-sm flex items-center justify-between gap-1 flex-wrap">
              <span>2. SỐ DƯỚI - Huyết áp Tâm trương (DIA)</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                Đẹp: 70-80 (An toàn &lt;{bpThresholds.highDia})
              </span>
            </div>
            <p className="text-slate-700">
              • <strong>Là gì:</strong> Áp lực máu còn giữ lại trong mạch <strong>lúc tim đang giãn ra nghỉ ngơi</strong> giữa 2 nhịp đập (thời điểm máu chảy về nuôi chính cơ tim).
            </p>
            <p className="text-amber-950 bg-amber-50/70 p-2 rounded-lg border border-amber-100">
              • <strong>Nếu cao (&ge;{bpThresholds.highDia}, nguy hiểm khi &ge;100 mmHg):</strong> Thành mạch máu bị co thắt căng cứng liên tục ngay cả lúc tim nghỉ, làm tim nhanh mệt và quá tải.
            </p>
            <p className="text-sky-900 bg-sky-50/70 p-2 rounded-lg border border-sky-100">
              • <strong>Nếu quá thấp (&le;{bpThresholds.lowDia} mmHg):</strong> Máu quay về nuôi cơ tim kém (hay gặp ở người lớn tuổi), làm {subjectLabel} dễ mỏi mệt, hụt hơi, tay chân lạnh.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-purple-200 space-y-1.5">
            <div className="font-black text-purple-900 text-xs sm:text-sm flex items-center justify-between gap-1 flex-wrap">
              <span>3. HIỆU ÁP (Độ chênh 2 số = Trên trừ Dưới)</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                Chuẩn đẹp: 40-55 mmHg
              </span>
            </div>
            <p className="text-slate-700">
              • <strong>Là gì:</strong> Lấy <strong>Số trên trừ đi Số dưới</strong> (VD: 125/75 có Hiệu áp = 50 mmHg). Chỉ số này cho biết <strong>độ mềm dẻo hay xơ cứng của thành mạch máu</strong>.
            </p>
            <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
              • <strong>Hiệu áp rộng (&ge;60 mmHg, VD 150/75):</strong> Thành động mạch của người lớn tuổi bị cứng, làm máu dội mạnh từng nhịp lên não và thận. Cần tránh để {subjectLabel} xúc động hay đứng phắt dậy đột ngột.<br />
              • <strong>Hiệu áp hẹp (&le;30 mmHg, VD 105/80):</strong> Nhịp bơm của tim hơi yếu hoặc cơ thể {subjectLabel} đang thiếu nước, cần uống đủ nước ấm rải đều trong ngày.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-teal-200 space-y-1.5">
            <div className="font-black text-teal-900 text-xs sm:text-sm flex items-center justify-between gap-1 flex-wrap">
              <span>4. SỨC MÁU NUÔI NÃO, ĐỘ ỔN ĐỊNH &amp; MẠCH</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                Mạch nghỉ: 60-79 bpm
              </span>
            </div>
            <p className="text-slate-700">
              • <strong>Sức đẩy máu nuôi não (Chuẩn 75-95 mmHg):</strong> Áp lực trung bình đẩy máu nuôi tế bào não. Không được để tụt dưới 65 mmHg hoặc vượt quá 105 mmHg.
            </p>
            <p className="text-slate-700">
              • <strong>Độ ổn định HA (Đều khi &lt;±10 mmHg):</strong> Huyết áp nhảy lên xuống thất thường (&ge;±15 mmHg giữa Sáng và Tối) nguy hiểm không kém huyết áp cao. Cần uống thuốc đúng khung giờ cố định.
            </p>
            <p className="text-slate-700 bg-violet-50/70 p-2 rounded-lg border border-violet-100">
              • <strong>Nhịp tim / Mạch (BPM):</strong> Nếu <strong>&lt;55-60 bpm</strong> có thể do thuốc làm chậm nhịp (cần hỏi Bác sĩ nếu kèm chóng mặt). Nếu <strong>&ge;100 bpm lúc nghỉ</strong> hoặc loạn nhịp không đều thì dễ báo hiệu {subjectLabel} đang sốt, đau hoặc mất nước.
            </p>
          </div>
        </div>
      </div>

      {/* PHẦN 2: CÁC TRIỆU CHỨNG ĐÁNG LO THÍCH ỨNG THEO HỒ SƠ */}
      {isPostStrokeProfile ? (
        <div className="space-y-2.5 pt-2 border-t border-teal-200">
          <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px]">PHẦN 2</span>
            <span>Các triệu chứng đáng lo cần theo dõi sát khi chăm sóc Bố tại nhà</span>
          </div>
          <p className="text-xs text-slate-700">
            Dành riêng cho Bố: đã mổ xuất huyết não, hiện <strong>đi lại được, không liệt</strong>, đang tập phục hồi chức năng tại nhà, có <strong>bán manh bên trái</strong> và <strong>đang chờ mổ ghép sọ sau khoảng 6-8 tuần</strong>.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2 text-rose-950">
              <div className="font-black text-xs sm:text-sm text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>🚨 MỨC ĐỎ - Gọi 115 / Đưa đi viện ngay</span>
              </div>
              <p className="text-xs font-bold text-rose-800">
                Không chờ, không tự cho uống thêm thuốc hạ áp, không cạo gió hay chích lễ. Mang theo đơn thuốc, giấy ra viện và phim chụp gần nhất:
              </p>
              <ul className="space-y-1.5 text-slate-800 list-disc pl-4">
                <li><strong>Đau đầu dữ dội, đột ngột, kèm buồn nôn / nôn vọt:</strong> có thể là chảy máu tái phát hoặc áp lực trong sọ tăng.</li>
                <li><strong>Yếu hoặc tê mới xuất hiện</strong> ở tay/chân/nửa mặt, đi loạng choạng, khuỵu chân, méo miệng, nói đớ hơn hẳn.</li>
                <li><strong>Lơ mơ, ngủ gà gọi khó dậy, lú lẫn đột ngột, hoặc co giật / ngất:</strong> để Bố nằm nghiêng an toàn và gọi cấp cứu.</li>
                <li><strong>Mắt:</strong> mất thị lực đột ngột, nhìn đôi mới xuất hiện, hoặc vùng không nhìn thấy bên trái rộng ra rõ rệt.</li>
                <li><strong>Vùng khuyết xương sọ / vết mổ:</strong> da sọ <strong>phồng căng nhanh</strong>, đập mạnh, hoặc <strong>lõm sâu hẳn xuống</strong>; chảy dịch, sưng nóng đỏ kèm sốt &ge;38.5°C, cứng gáy.</li>
                <li><strong>Cơn tăng huyết áp kịch phát (&ge;180/110 mmHg)</strong> kèm đau đầu, nhìn mờ, tức ngực, khó thở.</li>
                <li><strong>Sặc nghẹn, khó thở, tím môi</strong> hoặc ngã đập đầu kèm choáng, nôn.</li>
              </ul>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/90 border-2 border-amber-300 space-y-2 text-amber-950">
              <div className="font-black text-xs sm:text-sm text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>⚠️ MỨC VÀNG - Ghi sổ &amp; Báo bác sĩ trong ngày</span>
              </div>
              <p className="text-xs font-bold text-amber-900">
                Cho Bố nghỉ ngơi, đo lại huyết áp sau 15 phút, ghi vào Sổ. Nếu không đỡ hoặc nặng thêm, chuyển lên Mức Đỏ:
              </p>
              <ul className="space-y-1.5 text-slate-800 list-disc pl-4">
                <li><strong>Đau đầu âm ỉ tăng dần, buồn ngủ nhiều hơn thường ngày, hay quên, đi đứng chậm chạp hơn:</strong> báo bác sĩ phẫu thuật sớm.</li>
                <li><strong>Bán manh trái nặng lên</strong> hoặc xuất hiện thêm chớp sáng / nhìn mờ.</li>
                <li><strong>Chóng mặt, hoa mắt khi đổi tư thế, huyết áp dao động (&ge;15 mmHg giữa sáng và tối):</strong> cho Bố ngồi 3-5 phút trước khi đứng.</li>
                <li><strong>Sốt nhẹ (&ge;37.8°C), ho đờm đục, tiểu buốt, vết mổ đỏ/rỉ nhẹ:</strong> báo bác sĩ sớm để không ảnh hưởng lịch ghép sọ.</li>
                <li><strong>Ngã nhẹ hoặc va đầu dù vẫn tỉnh; táo bón trên 3 ngày phải rặn mạnh; mất ngủ kéo dài.</strong></li>
              </ul>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-sky-50 border-2 border-sky-200 text-sky-950 space-y-1.5">
            <div className="font-black text-xs sm:text-sm text-sky-900">
              🛡️ Giữ an toàn hằng ngày &amp; chuẩn bị trước ngày mổ ghép sọ
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-800">
              <li><strong>Khi đi lại:</strong> đi bên trái của Bố (bên bán manh), dọn lối đi gọn gàng, để đồ dùng ở bên phải.</li>
              <li><strong>Bảo vệ đầu:</strong> không nằm đè lên bên khuyết xương sọ, không tự ý ấn / xoa bóp vùng đó.</li>
              <li><strong>Khi tập phục hồi:</strong> tập nhẹ nhàng, tránh rặn mạnh hoặc cúi đầu thấp lâu; dừng ngay nếu đau đầu, chóng mặt.</li>
              <li><strong>Chuẩn bị ghép sọ:</strong> giữ da đầu sạch khô, uống thuốc đúng đơn và không tự ý ngưng thuốc chống đông / chống co giật / huyết áp.</li>
            </ul>
          </div>

          <p className="text-xs text-slate-600 italic">
            Lưu ý: nội dung mang tính tham khảo để gia đình nhận biết sớm, không thay thế chỉ định của bác sĩ điều trị.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 pt-2 border-t border-teal-200">
          <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px]">PHẦN 2</span>
            <span>Các dấu hiệu cảnh báo huyết áp &amp; tim mạch cần lưu ý đối với {patientName}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-1.5 text-rose-950">
              <div className="font-black text-xs sm:text-sm text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>🚨 MỨC ĐỎ - Đi khám cấp cứu ngay nếu có:</span>
              </div>
              <ul className="space-y-1 text-slate-800 list-disc pl-4">
                <li><strong>Huyết áp tăng vọt &ge; 180/110 mmHg</strong> kèm đau đầu dữ dội, tức ngực, khó thở, nhìn mờ hoặc buồn nôn.</li>
                <li><strong>Dấu hiệu đột quỵ sớm (FAST):</strong> Méo miệng khi cười, tê hoặc yếu một bên tay/chân, nói ngọng đột ngột.</li>
                <li><strong>Đau thắt ngực trái</strong> lan lên vai/cổ, vã mồ hôi lạnh, hồi hộp trống ngực mạnh hoặc ngất xỉu.</li>
              </ul>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-1.5 text-amber-950">
              <div className="font-black text-xs sm:text-sm text-amber-900">
                ⚠️ MỨC VÀNG - Nghỉ ngơi &amp; tham khảo ý kiến Bác sĩ:
              </div>
              <ul className="space-y-1 text-slate-800 list-disc pl-4">
                <li><strong>Huyết áp vượt ngưỡng (&ge; {bpThresholds.highSys}/{bpThresholds.highDia} mmHg)</strong> nhiều lần liên tiếp hoặc hay tăng vào sáng sớm / tối muộn.</li>
                <li><strong>Hạ huyết áp tư thế (&lt; {bpThresholds.lowSys}/{bpThresholds.lowDia} mmHg):</strong> Hoa mắt, choáng váng khi đứng dậy nhanh.</li>
                <li><strong>Nhịp tim lúc nghỉ quá chậm (&lt; 55-60 l/p) hoặc quá nhanh (&ge; 100 l/p)</strong> kèm cảm giác mệt lả, hụt hơi.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
