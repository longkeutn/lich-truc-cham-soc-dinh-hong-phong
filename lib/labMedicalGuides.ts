/**
 * Từ điển giải thích y khoa ngắn gọn, dễ hiểu cho người lớn tuổi (60+)
 * và gia đình: nêu rõ ý nghĩa chỉ số, tác hại nếu bất thường và ngưỡng an toàn.
 */
export interface LabMedicalGuide {
  title: string;
  whatItIs: string;
  harmWarning: string;
  safeTargetAndTips: string;
}

const LAB_MEDICAL_GUIDES: Record<string, LabMedicalGuide> = {
  // ===== HUYẾT ÁP & SINH HIỆU =====
  sys: {
    title: 'Số trên - Huyết áp Tâm thu (SYS)',
    whatItIs:
      'Là áp lực máu đẩy vào thành mạch lúc tim co bóp mạnh nhất để bơm máu đi nuôi não, tim và thận.',
    harmWarning:
      'Nếu thường xuyên >= 140 mmHg (đặc biệt >= 180 mmHg): mạch máu phải chịu sức ép lớn, dễ gây xơ vữa, vỡ hoặc tắc mạch máu não (đột quỵ), nhồi máu cơ tim và suy thận. Nếu tụt dưới 90-100 mmHg dễ hoa mắt, choáng ngã khi đứng dậy.',
    safeTargetAndTips:
      'Đẹp nhất lúc nghỉ: 115-130 mmHg (an toàn < 140). Sau đánh Tennis hoặc đạp xe cần ngồi nghỉ tĩnh 5-10 phút rồi mới đo; tránh đo ngay sau khi uống rượu bia hoặc hút thuốc.',
  },
  dia: {
    title: 'Số dưới - Huyết áp Tâm trương (DIA)',
    whatItIs:
      'Là áp lực máu còn giữ lại trong mạch lúc tim đang giãn ra nghỉ ngơi giữa hai nhịp đập (lúc máu về nuôi chính cơ tim).',
    harmWarning:
      'Nếu cao >= 90 mmHg kéo dài: thành mạch máu bị co cứng liên tục, tim không được nghỉ ngơi đầy đủ dẫn đến dày thành tim và suy tim. Nếu quá thấp (< 60 mmHg) máu nuôi cơ tim kém gây mệt, hụt hơi.',
    safeTargetAndTips:
      'Mục tiêu an toàn: 70-80 mmHg (dưới 90 mmHg). Trời rét buổi sáng sớm ở Thái Nguyên dễ làm co mạch tăng số dưới - cần mặc ấm trước khi ra sân Tennis hoặc đạp xe.',
  },
  pulse: {
    title: 'Nhịp tim / Mạch (BPM)',
    whatItIs:
      'Số lần tim đập trong 1 phút. Người chơi thể thao đều như Tennis, đạp xe thường có nhịp tim lúc nghỉ khá tốt và khỏe.',
    harmWarning:
      'Nếu lúc nghỉ kéo dài >= 100 lần/phút hoặc loạn nhịp (lúc nhanh lúc bỏ nhịp): tim phải làm việc quá sức, dễ hồi hộp, đau tức ngực (thường tăng sau uống rượu bia, hút thuốc hoặc thiếu nước). Nếu < 50 lần/phút kèm choáng váng cần kiểm tra bác sĩ.',
    safeTargetAndTips:
      'Tốt nhất lúc nghỉ: 60-79 lần/phút (bình thường 60-90). Nếu đang chơi Tennis thấy nhịp tim đập dồn dập kèm tức ngực, khó thở, chóng mặt phải dừng tập ngồi nghỉ ngay.',
  },

  // ===== BỘ MỠ MÁU =====
  cholesterol: {
    title: 'Cholesterol toàn phần',
    whatItIs:
      'Tổng lượng mỡ cholesterol lưu hành trong máu (gồm cả mỡ tốt và mỡ xấu), cần thiết cho tế bào nhưng dư thừa sẽ đóng cặn thành mạch.',
    harmWarning:
      'Tăng cao (>= 5.2 mmol/L hay >= 200 mg/dL) làm mảng mỡ bám dần vào thành động mạch, gây hẹp lòng mạch, tăng huyết áp, thiếu máu cơ tim và nguy cơ đột quỵ.',
    safeTargetAndTips:
      'Mục tiêu < 5.2 mmol/L (< 200 mg/dL). Hạn chế mỡ động vật, nội tạng, da gà vịt, đồ chiên rán và rượu bia; duy trì đi bộ, đạp xe, Tennis đều đặn.',
  },
  ldlC: {
    title: 'LDL-C (Mỡ xấu)',
    whatItIs:
      'Là "mỡ xấu" trực tiếp chui vào thành mạch máu để tạo thành các mảng xơ vữa làm cứng và hẹp động mạch.',
    harmWarning:
      'LDL-C cao là nguyên nhân hàng đầu gây nhồi máu cơ tim và đột quỵ. Nếu vừa có LDL-C cao vừa hút thuốc lá, chất độc thuốc lá làm lớp lót mạch máu xước rách khiến mỡ xấu bám vào nhanh gấp nhiều lần.',
    safeTargetAndTips:
      'Mục tiêu < 2.6 mmol/L (< 100 mg/dL). Nên ăn cá béo, dầu thực vật, rau xanh, giảm thịt mỡ và tuyệt đối không tự ý ngưng thuốc mỡ máu nếu bác sĩ đã kê.',
  },
  hdlC: {
    title: 'HDL-C (Mỡ tốt)',
    whatItIs:
      'Là "mỡ tốt" có nhiệm vụ như xe quét dọn, thu gom bớt mỡ xấu bám trên thành mạch máu đưa về gan để xử lý thải ra ngoài.',
    harmWarning:
      'HDL-C thấp (< 1.0-1.15 mmol/L) làm cơ thể mất lớp bảo vệ tự nhiên, mảng xơ vữa dễ tích tụ hơn. Hút thuốc lá làm sụt giảm HDL-C rất rõ.',
    safeTargetAndTips:
      'Mục tiêu > 1.15 mmol/L (> 45 mg/dL). Vận động thể thao đều (Tennis, đạp xe, đi bộ) và bỏ/giảm thuốc lá giúp tăng HDL-C tự nhiên.',
  },
  triglyceride: {
    title: 'Triglyceride (Mỡ trung tính)',
    whatItIs:
      'Loại mỡ dự trữ năng lượng trong máu, tăng rất nhanh sau bữa ăn nhiều tinh bột, đồ ngọt, thịt mỡ và đặc biệt là rượu bia.',
    harmWarning:
      'Tăng cao (>= 1.7 mmol/L) gây gan nhiễm mỡ, thúc đẩy xơ vữa mạch máu và tăng nguy cơ sỏi/polyp túi mật. Nếu tăng rất cao (>= 5.6 mmol/L) có thể gây viêm tụy cấp rất nguy hiểm.',
    safeTargetAndTips:
      'Mục tiêu < 1.70 mmol/L (< 150 mg/dL). Giảm rượu bia, giảm cơm trắng/đồ ngọt buổi tối và ăn tăng rau xanh.',
  },

  // ===== ĐƯỜNG HUYẾT & CHUYỂN HÓA =====
  glucose: {
    title: 'Glucose (Đường huyết lúc đói)',
    whatItIs:
      'Lượng đường trong máu đo khi nhịn ăn ít nhất 8 tiếng, phản ánh khả năng điều tiết đường của cơ thể tại thời điểm lấy máu.',
    harmWarning:
      'Đường máu cao kéo dài làm đường "ngâm" và làm giòn, tổn thương các mạch máu nhỏ ở mắt, thận, thần kinh bàn chân và tăng nhanh xơ vữa động mạch vành. Đường tụt (< 3.9 mmol/L) khi chơi thể thao gây vã mồ hôi, run tay, ngất.',
    safeTargetAndTips:
      'Chuẩn đẹp: 3.9 - 5.6 mmol/L (70 - 100 mg/dL). Từ 5.7 - 6.9 là tiền tiểu đường cần tiết chế đồ ngọt, nước có gas và rượu bia.',
  },
  hba1c: {
    title: 'HbA1c (Đường huyết trung bình 3 tháng)',
    whatItIs:
      'Phản ánh mức đường huyết trung bình trong suốt 2-3 tháng qua, không bị sai lệch bởi một bữa ăn ngay trước hôm xét nghiệm.',
    harmWarning:
      'Từ 5.7 - 6.4% là tiền tiểu đường; từ 6.5% trở lên là đái tháo đường, làm tăng gấp 2-3 lần nguy cơ biến chứng tim mạch, suy thận và tê bì chân tay.',
    safeTargetAndTips:
      'Mục tiêu an toàn: < 5.7%. Duy trì vận động đều (cơ bắp tiêu thụ đường rất tốt khi đánh Tennis, đạp xe) và giảm tinh bột tinh chế.',
  },
  calcium: {
    title: 'Canxi máu toàn phần',
    whatItIs:
      'Khoáng chất giữ vai trò dẫn truyền thần kinh, co cơ tim và độ chắc khỏe của xương.',
    harmWarning:
      'Hạ Canxi dễ gây tê bì đầu ngón tay chân, chuột rút khi chơi thể thao; tăng Canxi quá mức dễ gây sỏi thận và rối loạn nhịp tim.',
    safeTargetAndTips: 'Chuẩn: 2.15 - 2.55 mmol/L (8.6 - 10.2 mg/dL).',
  },
  ionizedCalcium: {
    title: 'Canxi ion hóa (Ca++)',
    whatItIs: 'Dạng Canxi hoạt động tự do thực sự trong máu, phản ánh chính xác nhất tình trạng Canxi.',
    harmWarning: 'Thấp < 1.10 mmol/L dễ gây tê quanh miệng, tê tay chân hoặc co rút cơ.',
    safeTargetAndTips: 'Chuẩn: 1.10 - 1.35 mmol/L.',
  },
  phosphorus: {
    title: 'Phospho máu',
    whatItIs: 'Khoáng chất đi cặp với Canxi để tạo xương và dự trữ năng lượng.',
    harmWarning: 'Phospho tăng cao kéo dài kết hợp Canxi cao dễ lắng đọng vôi hóa thành mạch và sỏi thận.',
    safeTargetAndTips: 'Chuẩn: 0.81 - 1.45 mmol/L.',
  },
  pth: {
    title: 'PTH (Hormone tuyến cận giáp)',
    whatItIs: 'Hormone điều chỉnh nồng độ Canxi và Phospho trong máu.',
    harmWarning: 'Quá thấp gây tụt Canxi; quá cao kéo dài làm rút Canxi từ xương gây loãng xương.',
    safeTargetAndTips: 'Chuẩn: 15 - 65 pg/mL.',
  },
  albumin: {
    title: 'Albumin máu',
    whatItIs: 'Loại đạm chính do gan sản xuất, phản ánh dinh dưỡng và chức năng tổng hợp của gan.',
    harmWarning: 'Albumin giảm thấp báo hiệu suy dinh dưỡng, bệnh gan mạn hoặc thất thoát đạm qua thận.',
    safeTargetAndTips: 'Chuẩn: 35 - 50 g/L (3.5 - 5.0 g/dL).',
  },
  vitaminD: {
    title: '25-OH Vitamin D',
    whatItIs: 'Vitamin giúp ruột hấp thu Canxi vào xương và tăng cường sức đề kháng cơ bắp.',
    harmWarning: 'Thiếu (< 20-30 ng/mL) dễ đau mỏi xương khớp, chuột rút và loãng xương tuổi 60+.',
    safeTargetAndTips: 'Tối ưu: 30 - 60 ng/mL. Tắm nắng nhẹ buổi sáng hoặc vận động ngoài trời giúp tạo Vitamin D.',
  },

  // ===== GAN, MẬT, THẬN, GOUT =====
  ast: {
    title: 'AST / GOT (Men gan)',
    whatItIs: 'Enzym nằm trong tế bào gan (và một phần ở cơ tim, cơ bắp). Khi tế bào gan bị tổn thương sẽ rò rỉ vào máu.',
    harmWarning:
      'Tăng > 40 U/L báo hiệu gan đang bị viêm hoặc quá tải (thường gặp do rượu bia, gan nhiễm mỡ hoặc tác dụng phụ thuốc). Lưu ý: đánh Tennis cường độ rất nặng trước hôm xét nghiệm cũng có thể làm AST tăng nhẹ từ cơ.',
    safeTargetAndTips:
      'An toàn < 37-40 U/L. Nếu uống rượu bia nhiều khiến men gan tăng kéo dài, tế bào gan dần xơ hóa.',
  },
  alt: {
    title: 'ALT / GPT (Men gan đặc hiệu)',
    whatItIs: 'Enzym nằm chủ yếu ở tế bào gan, phản ánh sát nhất tình trạng gan có đang bị viêm hay nhiễm mỡ không.',
    harmWarning:
      'ALT tăng cao (> 40 U/L) cho thấy tế bào gan đang bị tổn thương do rượu bia, gan nhiễm mỡ hoặc thuốc. Gan tổn thương lâu ngày dẫn đến viêm gan mạn, xơ gan.',
    safeTargetAndTips:
      'An toàn < 40 U/L. Giảm tối đa rượu bia, tránh tự ý uống thuốc giảm đau hoặc thuốc lá nam không rõ nguồn gốc.',
  },
  ggt: {
    title: 'GGT (Gamma-GT - Chỉ số Gan Mật nhạy với Rượu bia)',
    whatItIs:
      'Enzym nằm ở ống dẫn mật và tế bào gan. Đây là chỉ số báo động sớm nhất khi gan phải gồng mình giải độc rượu bia hoặc khi đường mật có vấn đề.',
    harmWarning:
      'Nhiều người AST/ALT vẫn bình thường nhưng GGT đã tăng vọt do uống rượu bia đều đặn hoặc tắc nghẽn đường mật/túi mật. GGT cao kéo dài đi kèm nguy cơ xơ gan, gan nhiễm mỡ nặng và biến cố tim mạch.',
    safeTargetAndTips:
      'An toàn nam giới < 60 U/L (tốt nhất < 40 U/L). Cách hiệu quả nhất để hạ GGT là giảm/ngưng rượu bia và uống đủ nước lọc.',
  },
  bilirubinTotal: {
    title: 'Bilirubin toàn phần (Sắc tố mật)',
    whatItIs: 'Chất tạo ra từ hồng cầu và được gan xử lý thải qua đường mật xuống ruột.',
    harmWarning:
      'Tăng cao (> 17-21 µmol/L) gây vàng mắt, vàng da; có thể báo hiệu gan suy giảm chức năng lọc hoặc đường mật/túi mật bị ứ tắc (cần đối chiếu cùng Polyp túi mật nếu có).',
    safeTargetAndTips: 'An toàn: 3.4 - 17.1 µmol/L (hoặc < 21 µmol/L tùy phòng xét nghiệm).',
  },
  bilirubinDirect: {
    title: 'Bilirubin trực tiếp',
    whatItIs: 'Phần sắc tố mật đã được gan chuyển hóa sẵn sàng đổ vào túi mật và đường ruột.',
    harmWarning:
      'Tăng cao (> 5.1 µmol/L) thường gợi ý ứ mật tại gan hoặc tắc nghẽn ống mật/túi mật.',
    safeTargetAndTips: 'An toàn < 5.1 µmol/L. Cần báo bác sĩ ngay nếu kèm đau tức hạ sườn phải hoặc vàng mắt.',
  },
  creatinine: {
    title: 'Creatinine máu (Chức năng lọc của Thận)',
    whatItIs: 'Chất thải từ cơ bắp được thận lọc bỏ hoàn toàn qua nước tiểu. Thận khỏe thì chỉ số này giữ ở mức thấp ổn định.',
    harmWarning:
      'Tăng cao (> 110 µmol/L ở nam) cho thấy thận lọc kém đi. Huyết áp cao, Acid Uric (Gout) lắng đọng tinh thể ở thận và thói quen tự uống thuốc giảm đau khớp/đau bụng rất dễ làm hại thận.',
    safeTargetAndTips:
      'Chuẩn nam giới: 62 - 106 µmol/L (an toàn < 110). Uống đủ 2 - 2.5 lít nước/ngày (đặc biệt sau Tennis), kiểm soát huyết áp và tuyệt đối không tự mua thuốc giảm đau NSAID khi đau khớp Gout hay đau bụng IBS.',
  },
  egfr: {
    title: 'eGFR (Mức lọc cầu thận ước tính)',
    whatItIs: 'Thước đo chính xác phần trăm sức lọc của thận theo tuổi tác, giúp phát hiện suy thận sớm hơn cả Creatinine đơn lẻ.',
    harmWarning:
      'Dưới 60 mL/phút kéo dài là dấu hiệu bệnh thận mạn: thận khó thải độc tố, dễ tích nước làm tăng huyết áp nặng hơn và tăng Acid Uric gây Gout nặng thêm.',
    safeTargetAndTips:
      'Tốt: >= 90 mL/phút; tuổi 60+ từ 60 - 89 cần giữ ổn định bằng cách kiểm soát tốt huyết áp, uống đủ nước và tránh thuốc độc thận.',
  },
  urea: {
    title: 'Ure máu',
    whatItIs: 'Chất thải từ quá trình tiêu hóa đạm (thịt, cá...) được thận lọc ra ngoài.',
    harmWarning: 'Tăng cao (> 7.5 mmol/L) thường do uống thiếu nước (nhất là sau chơi thể thao ra nhiều mồ hôi) hoặc chức năng thận suy giảm.',
    safeTargetAndTips: 'Chuẩn: 2.5 - 7.5 mmol/L. Nhớ bù đủ nước lọc sau khi đánh Tennis và đạp xe.',
  },
  uricAcid: {
    title: 'Acid Uric máu (Nguy cơ Gout tái phát)',
    whatItIs: 'Chất sinh ra khi cơ thể phân hủy đạm purin (nhiều trong bia, nội tạng, hải sản, thịt đỏ). Bình thường thận sẽ thải ra ngoài.',
    harmWarning:
      'Khi vượt ngưỡng bão hòa (> 360 - 420 µmol/L), Acid Uric kết tinh thành các tinh thể sắc nhọn như kim đâm vào khớp ngón chân cái, cổ chân, đầu gối gây sưng nóng đỏ đau dữ dội (cơn Gout cấp), làm hỏng sụn khớp và tạo sỏi thận urat. Rượu bia làm thận NGƯNG thải Acid Uric ngay lập tức!',
    safeTargetAndTips:
      'Với người từng bị Gout tái phát: mục tiêu kiểm soát tốt là < 360 µmol/L (ngưỡng chung nam < 420). Cần uống nhiều nước lọc, hạn chế tối đa bia rượu, nội tạng, nước hầm xương, hải sản vỏ cứng.',
  },
  hemoglobin: {
    title: 'Hemoglobin (Huyết sắc tố)',
    whatItIs: 'Chất mang oxy trong hồng cầu đi nuôi cơ bắp và tim não khi sinh hoạt, chơi thể thao.',
    harmWarning: 'Thấp (< 120 g/L hay < 12 g/dL) gây thiếu máu, hụt hơi, nhanh mệt khi chạy sân Tennis hoặc đạp xe.',
    safeTargetAndTips: 'Chuẩn nam giới: 130 - 170 g/L (13 - 17 g/dL).',
  },

  // ===== SIÊU ÂM ĐỊNH KỲ =====
  gallbladderPolypMm: {
    title: 'Polyp túi mật (Kích thước mm trên Siêu âm)',
    whatItIs:
      'Là khối mô nhỏ nhô lên từ niêm mạc bên trong thành túi mật. Đa số polyp nhỏ là lành tính (thường liên quan mỡ máu cao hoặc dịch mật cô đặc).',
    harmWarning:
      'Nguy cơ đáng ngại nhất là polyp lớn dần theo thời gian: khi kích thước >= 10 mm hoặc tăng nhanh (>= 2 mm mỗi kỳ), nguy cơ chuyển biến ác tính (ung thư túi mật) tăng cao hơn rõ rệt. Nếu kèm sỏi mật hoặc đau tức hạ sườn phải cần đi khám sớm.',
    safeTargetAndTips:
      'Dưới 6 mm: lành tính, siêu âm theo dõi định kỳ 6 - 12 tháng/lần. Từ 6 - 9.9 mm: theo dõi sát 3 - 6 tháng/lần. Chạm >= 10 mm: khám Ngoại tiêu hóa ngay. Nên ăn ít mỡ, hạn chế rượu bia và uống đủ nước để dịch mật lưu thông tốt.',
  },
  liverUltrasound: {
    title: 'Siêu âm Gan (Theo dõi Gan nhiễm mỡ)',
    whatItIs: 'Đánh giá hình ảnh nhu mô gan có tích tụ mỡ hay xơ hóa không.',
    harmWarning:
      'Gan nhiễm mỡ độ 2-3 kết hợp với rượu bia sẽ âm thầm chuyển sang viêm gan thoái hóa mỡ, tăng men gan GGT/ALT và lâu dài dẫn đến xơ gan.',
    safeTargetAndTips:
      'Giữ cân nặng hợp lý, duy trì Tennis/đạp xe đều đặn và giảm rượu bia giúp gan hết nhiễm mỡ rất nhanh.',
  },
  kidneyUltrasound: {
    title: 'Siêu âm Thận (Tầm soát sỏi urat & nang thận)',
    whatItIs: 'Kiểm tra hình thái thận xem có sỏi thận, ứ nước hay nang thận không.',
    harmWarning:
      'Người có tiền sử Gout và uống ít nước sau khi chơi thể thao rất dễ hình thành sỏi urat ở thận gây đau lưng, tiểu buốt hoặc tắc nghẽn làm suy giảm chức năng thận.',
    safeTargetAndTips: 'Uống đủ 2 - 2.5 lít nước lọc mỗi ngày (chia đều trước, trong và sau khi chơi Tennis).',
  },

  // ===== TUYẾN GIÁP (Dành cho hồ sơ Mẹ nếu xem cùng) =====
  tsh: {
    title: 'TSH (Hormone kích thích tuyến giáp)',
    whatItIs: 'Hormone tuyến yên tiết ra để điều khiển hoạt động tuyến giáp hoặc đánh giá mức độ ức chế sau mổ.',
    harmWarning: 'Quá cao (> 4.2) là thiếu hormone giáp gây mệt, tăng mỡ máu; quá thấp (< 0.05) kéo dài dễ gây tim đập nhanh và loãng xương.',
    safeTargetAndTips: 'Tuân thủ đúng liều Levothyroxine lúc đói theo đích Bác sĩ đặt.',
  },
  ft4: {
    title: 'FT4 (Thyroxine tự do)',
    whatItIs: 'Lượng hormone tuyến giáp chính đang lưu hành tự do trong máu.',
    harmWarning: 'Cao quá ngưỡng dễ gây hồi hộp, mạch nhanh; thấp quá gây mệt mỏi, sợ lạnh.',
    safeTargetAndTips: 'Chuẩn: 12.0 - 22.0 pmol/L (0.93 - 1.70 ng/dL).',
  },
  ft3: {
    title: 'FT3 (Triiodothyronine tự do)',
    whatItIs: 'Dạng hormone tuyến giáp có hoạt tính mạnh nhất lên tế bào.',
    harmWarning: 'Tăng cao gây tim đập nhanh, run tay, sụt cân.',
    safeTargetAndTips: 'Chuẩn: 2.0 - 4.4 pg/mL (3.1 - 6.8 pmol/L).',
  },
  t3: {
    title: 'T3 toàn phần',
    whatItIs: 'Tổng lượng hormone T3 trong máu.',
    harmWarning: 'Cao gây cường giáp, mạch nhanh.',
    safeTargetAndTips: 'Chuẩn: 1.1 - 2.8 nmol/L (70 - 180 ng/dL).',
  },
  t4: {
    title: 'T4 toàn phần',
    whatItIs: 'Tổng lượng hormone T4 trong máu.',
    harmWarning: 'Bất thường phản ánh dư hoặc thiếu hormone thay thế.',
    safeTargetAndTips: 'Chuẩn: 5.1 - 14.1 µg/dL (66 - 181 nmol/L).',
  },
  tg: {
    title: 'TG (Thyroglobulin - Marker tuyến giáp)',
    whatItIs: 'Dấu ấn theo dõi mô giáp còn lại sau phẫu thuật.',
    harmWarning: 'Tăng dần qua nhiều lần đo liên tiếp cần báo bác sĩ chuyên khoa kiểm tra.',
    safeTargetAndTips: 'Sau cắt toàn bộ tuyến giáp, TG càng thấp (< 0.2 ng/mL) càng tốt.',
  },
  antiTg: {
    title: 'Anti-TG (Kháng thể kháng Thyroglobulin)',
    whatItIs: 'Kháng thể có thể làm nhiễu kết quả đo TG.',
    harmWarning: 'Khi Anti-TG tăng cao cần theo dõi xu hướng giảm dần của chính Anti-TG.',
    safeTargetAndTips: 'Bình thường < 115 IU/mL.',
  },
  antiTpo: {
    title: 'Anti-TPO',
    whatItIs: 'Kháng thể đánh giá yếu tố viêm tuyến giáp tự miễn.',
    harmWarning: 'Tăng cao gợi ý bệnh lý tuyến giáp tự miễn.',
    safeTargetAndTips: 'Bình thường < 34 IU/mL.',
  },
};

export function getLabMedicalGuide(key: string): LabMedicalGuide | null {
  return LAB_MEDICAL_GUIDES[key] || null;
}
