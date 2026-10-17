import { VitalsPeriod } from './types';

export interface ParsedVoiceVitals {
  rawText: string;
  normalizedText: string;
  sys?: number;
  dia?: number;
  pulse?: number;
  period?: VitalsPeriod;
  note?: string;
  autoSave?: boolean;
  isComplete: boolean;
  summary: string;
}

const VI_DIGITS: Record<string, number> = {
  'không': 0,
  'linh': 0,
  'lẻ': 0,
  'một': 1,
  'mốt': 1,
  'hai': 2,
  'ba': 3,
  'bốn': 4,
  'tư': 4,
  'năm': 5,
  'lăm': 5,
  'nhăm': 5,
  'rưỡi': 5,
  'sáu': 6,
  'bảy': 7,
  'bẩy': 7,
  'tám': 8,
  'chín': 9,
};

/**
 * Chuyển các cụm từ chỉ số bằng chữ tiếng Việt (kể cả khẩu ngữ rút gọn của người lớn tuổi)
 * sang số nguyên chuẩn.
 *
 * Hỗ trợ:
 * - "một trăm ba mươi lăm" / "một trăm ba lăm" / "trăm ba lăm" -> 135
 * - "một ba lăm" / "một ba năm" -> 135
 * - "trăm rưỡi" / "một trăm rưỡi" -> 150
 * - "trăm tư" / "một trăm tư" / "trăm bốn" -> 140
 * - "trăm hai" -> 120, "trăm ba" -> 130, "trăm mốt" -> 110
 * - "tám mươi lăm" / "tám lăm" -> 85
 * - "tám mươi" / "tám chục" -> 80
 * - Lỗi tách số của Google Speech-to-Text: "100 35" -> "135", "trăm 35" -> "135"
 */
export function convertVietnameseWordsToNumbers(input: string): string {
  let s = input.toLowerCase().trim();

  // Chuẩn hóa dấu câu phân cách giữa các số
  s = s.replace(/\s*[/\\|-]\s*/g, ' trên ');
  s = s.replace(/[,;]+/g, ' ');

  // 1. Xử lý các cụm khẩu ngữ đặc biệt "trăm rưỡi", "một trăm rưỡi"
  s = s.replace(/\b(?:một\s+)?trăm\s+rưỡi\b/g, '150');
  s = s.replace(/\b100\s+rưỡi\b/g, '150');

  // 2. Xử lý trường hợp STT biến "một trăm" thành "100" rồi để chữ phía sau: "100 ba mươi lăm" -> "một trăm ba mươi lăm"
  s = s.replace(/\b100\s+(linh|lẻ|một|mốt|hai|ba|bốn|tư|năm|lăm|sáu|bảy|bẩy|tám|chín)\b/g, 'một trăm $1');

  // 3. Xử lý trường hợp STT biến "trăm 35" -> "135", "một trăm 35" -> "135", "hai trăm 10" -> "210"
  s = s.replace(/\b(?:(một|hai)\s+)?trăm\s+(\d{1,2})\b/g, (_, hWord, tailDigits) => {
    const h = hWord === 'hai' ? 2 : 1;
    const tail = parseInt(tailDigits, 10);
    return String(h * 100 + tail);
  });

  // 4. Duyệt từng token để gom các cụm từ chỉ số tiếng Việt thành số
  const tokens = s.split(/\s+/);
  const out: string[] = [];

  const isDigitWord = (w: string) => Object.prototype.hasOwnProperty.call(VI_DIGITS, w);
  const isNumberMultiplier = (w: string) => w === 'trăm' || w === 'mươi' || w === 'chục';

  let i = 0;
  while (i < tokens.length) {
    const w = tokens[i];

    if (isDigitWord(w) || w === 'trăm' || w === 'mười') {
      // Thu thập chuỗi các từ chỉ số liên tiếp
      const numWords: string[] = [];
      let j = i;
      while (
        j < tokens.length &&
        (isDigitWord(tokens[j]) || isNumberMultiplier(tokens[j]) || tokens[j] === 'mười')
      ) {
        numWords.push(tokens[j]);
        j++;
      }

      const parsed = parseVietnameseNumberPhrase(numWords);
      if (parsed.length > 0) {
        out.push(...parsed.map(String));
        i = j;
        continue;
      }
    }

    out.push(w);
    i++;
  }

  let result = out.join(' ');

  // 5. Xử lý lỗi kinh điển của Google Web Speech API tiếng Việt:
  // Khi đọc "một trăm ba mươi lăm", STT rất hay trả về "100 35" hoặc "200 10"
  // Nếu "100" hoặc "200" đứng ngay trước một số có 2 chữ số (10..99), và:
  // - Theo sau là từ "trên"/"phần" HOẶC theo sau là ít nhất 1 số nữa (VD: "100 35 85"),
  //   HOẶC số 2 chữ số đó < 45 (không thể là huyết áp tâm trương DIA)
  result = result.replace(
    /\b(100|200)\s+(\d{2})(?=\s+(?:trên|phần|gạch|tâm\s+trương|số\s+dưới|\d{2,3})\b)/g,
    (_, hundreds, tens) => String(parseInt(hundreds, 10) + parseInt(tens, 10))
  );

  // Trường hợp chỉ có "100" + số < 45 ở đầu câu (VD: "100 35")
  result = result.replace(/\b(100|200)\s+([1-3]\d|4[0-4])\b/g, (_, hundreds, tens) =>
    String(parseInt(hundreds, 10) + parseInt(tens, 10))
  );

  return result;
}

/**
 * Phân tích một mảng các từ chỉ số liên tiếp thành 1 hoặc nhiều số nguyên.
 * Ví dụ:
 * - ["một", "trăm", "ba", "mươi", "lăm"] -> [135]
 * - ["trăm", "ba", "lăm"] -> [135]
 * - ["trăm", "tư"] -> [140]
 * - ["một", "ba", "lăm", "tám", "lăm"] -> [135, 85]
 * - ["tám", "mươi", "lăm"] -> [85]
 */
function parseVietnameseNumberPhrase(words: string[]): number[] {
  const results: number[] = [];
  let idx = 0;

  while (idx < words.length) {
    const w0 = words[idx];
    const w1 = words[idx + 1];
    const w2 = words[idx + 2];
    const w3 = words[idx + 3];
    const w4 = words[idx + 4];

    // Mẫu A: [một/hai] + "trăm" + ...
    if ((w0 === 'một' || w0 === 'hai') && w1 === 'trăm') {
      const hundreds = VI_DIGITS[w0] * 100;
      const consumed = consumeAfterHundreds(words, idx + 2, hundreds);
      results.push(consumed.value);
      idx = consumed.nextIdx;
      continue;
    }

    // Mẫu B: "trăm" (khuyết "một" ở đầu, VD: "trăm ba lăm", "trăm tư", "trăm linh năm")
    if (w0 === 'trăm') {
      const consumed = consumeAfterHundreds(words, idx + 1, 100);
      results.push(consumed.value);
      idx = consumed.nextIdx;
      continue;
    }

    // Mẫu C: "mười" + [đơn vị] (10..19)
    if (w0 === 'mười') {
      if (w1 && VI_DIGITS[w1] !== undefined && w1 !== 'linh' && w1 !== 'lẻ') {
        results.push(10 + VI_DIGITS[w1]);
        idx += 2;
      } else {
        results.push(10);
        idx += 1;
      }
      continue;
    }

    // Mẫu D: [chục] + "mươi"/"chục" + [đơn vị]? (20..99)
    if (VI_DIGITS[w0] >= 2 && VI_DIGITS[w0] <= 9 && (w1 === 'mươi' || w1 === 'chục')) {
      const tens = VI_DIGITS[w0] * 10;
      if (w2 && VI_DIGITS[w2] !== undefined && w2 !== 'linh' && w2 !== 'lẻ') {
        results.push(tens + VI_DIGITS[w2]);
        idx += 3;
      } else {
        results.push(tens);
        idx += 2;
      }
      continue;
    }

    // Mẫu E: Đọc từng chữ số kiểu "một ba lăm" (135) hoặc "một bốn không" (140)
    // Nếu bắt đầu bằng "một" hoặc "hai", theo sau là 2 chữ số (và không phải cấu trúc hàng chục ở w2="mươi")
    if (
      (w0 === 'một' || w0 === 'hai') &&
      w1 &&
      VI_DIGITS[w1] !== undefined &&
      w2 &&
      VI_DIGITS[w2] !== undefined &&
      w2 !== 'mươi' &&
      w2 !== 'chục' &&
      w2 !== 'trăm'
    ) {
      // Nếu w3 là "mươi"/"chục" (VD: "một trăm" bị thiếu từ trăm? Không, nếu "một ba năm mươi" hiếm gặp)
      const val = VI_DIGITS[w0] * 100 + VI_DIGITS[w1] * 10 + VI_DIGITS[w2];
      results.push(val);
      idx += 3;
      continue;
    }

    // Mẫu F: "một" + [chục] + "mươi" + [đơn vị]? (VD: "một ba mươi lăm" = 135, "một hai mươi" = 120)
    if (
      (w0 === 'một' || w0 === 'hai') &&
      w1 &&
      VI_DIGITS[w1] >= 1 &&
      VI_DIGITS[w1] <= 9 &&
      (w2 === 'mươi' || w2 === 'chục')
    ) {
      const base = VI_DIGITS[w0] * 100 + VI_DIGITS[w1] * 10;
      if (w3 && VI_DIGITS[w3] !== undefined && w3 !== 'linh' && w3 !== 'lẻ') {
        results.push(base + VI_DIGITS[w3]);
        idx += 4;
      } else {
        results.push(base);
        idx += 3;
      }
      continue;
    }

    // Mẫu G: Đọc rút gọn 2 chữ số kiểu "tám lăm" (85), "bảy tư" (74), "sáu mốt" (61), "chín hai" (92)
    if (
      VI_DIGITS[w0] >= 2 &&
      VI_DIGITS[w0] <= 9 &&
      w1 &&
      VI_DIGITS[w1] !== undefined &&
      w1 !== 'linh' &&
      w1 !== 'lẻ' &&
      w2 !== 'trăm'
    ) {
      results.push(VI_DIGITS[w0] * 10 + VI_DIGITS[w1]);
      idx += 2;
      continue;
    }

    // Mẫu H: 1 chữ số đơn lẻ
    if (VI_DIGITS[w0] !== undefined) {
      results.push(VI_DIGITS[w0]);
      idx += 1;
      continue;
    }

    // Không khớp được thì bỏ qua từ này
    idx += 1;
    void w4;
  }

  return results;
}

function consumeAfterHundreds(
  words: string[],
  startIdx: number,
  hundredsBase: number
): { value: number; nextIdx: number } {
  const w0 = words[startIdx];
  const w1 = words[startIdx + 1];
  const w2 = words[startIdx + 2];
  const w3 = words[startIdx + 3];

  if (!w0) {
    return { value: hundredsBase, nextIdx: startIdx };
  }

  // "trăm linh năm" / "trăm lẻ năm" -> 105
  if ((w0 === 'linh' || w0 === 'lẻ') && w1 && VI_DIGITS[w1] !== undefined) {
    return { value: hundredsBase + VI_DIGITS[w1], nextIdx: startIdx + 2 };
  }

  // "trăm mười" / "trăm mười lăm" -> 110 / 115
  if (w0 === 'mười') {
    if (w1 && VI_DIGITS[w1] !== undefined && w1 !== 'linh' && w1 !== 'lẻ') {
      return { value: hundredsBase + 10 + VI_DIGITS[w1], nextIdx: startIdx + 2 };
    }
    return { value: hundredsBase + 10, nextIdx: startIdx + 1 };
  }

  // "trăm ba mươi lăm" / "trăm ba mươi"
  if (VI_DIGITS[w0] >= 1 && VI_DIGITS[w0] <= 9 && (w1 === 'mươi' || w1 === 'chục')) {
    const tens = VI_DIGITS[w0] * 10;
    if (w2 && VI_DIGITS[w2] !== undefined && w2 !== 'linh' && w2 !== 'lẻ') {
      return { value: hundredsBase + tens + VI_DIGITS[w2], nextIdx: startIdx + 3 };
    }
    return { value: hundredsBase + tens, nextIdx: startIdx + 2 };
  }

  // "trăm ba lăm" / "trăm bốn lăm" / "trăm hai tư" (khuyết chữ "mươi")
  // Lưu ý phân biệt với "trăm ba tám lăm" (130 và 85):
  // Nếu w2 là chữ số nhưng w3 KHÔNG phải chữ số/mươi (tức chỉ có đúng 3 từ số sau "trăm"),
  // hoặc w0 là "tư"/"mốt"/"rưỡi" (chỉ đứng ở dạng rút gọn tròn chục "trăm tư"=140, "trăm mốt"=110)
  const isShorthandTensOnly = w0 === 'tư' || w0 === 'mốt' || w0 === 'rưỡi';
  const hasOddTrailingDigit =
    w2 !== undefined &&
    VI_DIGITS[w2] !== undefined &&
    (w3 === undefined || (VI_DIGITS[w3] === undefined && w3 !== 'mươi' && w3 !== 'chục'));

  if (
    !isShorthandTensOnly &&
    !hasOddTrailingDigit &&
    VI_DIGITS[w0] >= 1 &&
    VI_DIGITS[w0] <= 9 &&
    w1 &&
    VI_DIGITS[w1] !== undefined &&
    w1 !== 'linh' &&
    w1 !== 'lẻ' &&
    w1 !== 'trăm' &&
    w2 !== 'mươi' &&
    w2 !== 'chục'
  ) {
    return { value: hundredsBase + VI_DIGITS[w0] * 10 + VI_DIGITS[w1], nextIdx: startIdx + 2 };
  }

  // "trăm tư" (140), "trăm rưỡi" (150), "trăm mốt" (110), "trăm hai" (120), "trăm ba" (130)...
  if (VI_DIGITS[w0] >= 1 && VI_DIGITS[w0] <= 9) {
    return { value: hundredsBase + VI_DIGITS[w0] * 10, nextIdx: startIdx + 1 };
  }

  return { value: hundredsBase, nextIdx: startIdx };
}

/**
 * Phân tích câu nói tiếng Việt thành các trường dữ liệu Huyết Áp (SYS, DIA, Mạch, Buổi đo, Ghi chú).
 * Hoàn toàn chạy cục bộ trên trình duyệt (0ms, không gọi API AI).
 */
export function parseVoiceVitals(rawTranscript: string): ParsedVoiceVitals {
  const rawText = rawTranscript.trim();
  if (!rawText) {
    return {
      rawText: '',
      normalizedText: '',
      isComplete: false,
      summary: '',
    };
  }

  const normalizedText = convertVietnameseWordsToNumbers(rawText);
  let working = normalizedText;

  // 1. Kiểm tra lệnh tự động lưu ở cuối câu ("lưu luôn", "lưu ngay", "bấm lưu", "lưu huyết áp")
  let autoSave = false;
  if (/\b(lưu\s+luôn|lưu\s+ngay|bấm\s+lưu|nhấn\s+lưu|lưu\s+lại)\b/i.test(working)) {
    autoSave = true;
    working = working.replace(/\b(lưu\s+luôn|lưu\s+ngay|bấm\s+lưu|nhấn\s+lưu|lưu\s+lại)\b/gi, ' ');
  }

  // 2. Nhận diện buổi đo (nếu người dùng có nói rõ trong câu)
  let period: VitalsPeriod | undefined;
  if (/\b(buổi\s+sáng|sáng\s+nay|ca\s+sáng)\b/i.test(working)) {
    period = 'morning';
    working = working.replace(/\b(buổi\s+sáng|sáng\s+nay|ca\s+sáng)\b/gi, ' ');
  } else if (/\b(buổi\s+trưa|trưa\s+nay|ca\s+trưa)\b/i.test(working)) {
    period = 'noon';
    working = working.replace(/\b(buổi\s+trưa|trưa\s+nay|ca\s+trưa)\b/gi, ' ');
  } else if (/\b(buổi\s+chiều|chiều\s+nay|ca\s+chiều)\b/i.test(working)) {
    period = 'afternoon';
    working = working.replace(/\b(buổi\s+chiều|chiều\s+nay|ca\s+chiều)\b/gi, ' ');
  } else if (/\b(buổi\s+tối|tối\s+nay|ca\s+tối|ban\s+đêm|đêm\s+nay)\b/i.test(working)) {
    period = 'evening';
    working = working.replace(/\b(buổi\s+tối|tối\s+nay|ca\s+tối|ban\s+đêm|đêm\s+nay)\b/gi, ' ');
  }

  let sys: number | undefined;
  let dia: number | undefined;
  let pulse: number | undefined;

  // 3. Ưu tiên bắt các chỉ số có từ khóa chỉ định rõ ràng trước
  // 3a. Mạch / Nhịp tim: "mạch 78", "nhịp tim 78", "tim 78", "78 nhịp"
  const pulseExplicit = working.match(
    /\b(?:mạch|nhịp\s*tim|nhịp|tim|pulse)\s*(?:là\s*)?(\d{2,3})\b/i
  );
  if (pulseExplicit) {
    const val = parseInt(pulseExplicit[1], 10);
    if (val >= 30 && val <= 240) {
      pulse = val;
      working = working.replace(pulseExplicit[0], ' ');
    }
  } else {
    const pulseSuffix = working.match(/\b(\d{2,3})\s*(?:nhịp\s*trên\s*phút|nhịp\/phút|bpm|nhịp)\b/i);
    if (pulseSuffix) {
      const val = parseInt(pulseSuffix[1], 10);
      if (val >= 30 && val <= 240) {
        pulse = val;
        working = working.replace(pulseSuffix[0], ' ');
      }
    }
  }

  // 3b. Tâm thu / Số trên: "tâm thu 135", "số trên 135", "huyết áp trên 135"
  const sysExplicit = working.match(
    /\b(?:tâm\s*thu|số\s*trên|số\s*cao|huyết\s*áp\s*trên|sys)\s*(?:là\s*)?(\d{2,3})\b/i
  );
  if (sysExplicit) {
    const val = parseInt(sysExplicit[1], 10);
    if (val >= 60 && val <= 280) {
      sys = val;
      working = working.replace(sysExplicit[0], ' ');
    }
  }

  // 3c. Tâm trương / Số dưới: "tâm trương 85", "số dưới 85", "huyết áp dưới 85"
  const diaExplicit = working.match(
    /\b(?:tâm\s*trương|số\s*dưới|số\s*thấp|huyết\s*áp\s*dưới|dia)\s*(?:là\s*)?(\d{2,3})\b/i
  );
  if (diaExplicit) {
    const val = parseInt(diaExplicit[1], 10);
    if (val >= 30 && val <= 180) {
      dia = val;
      working = working.replace(diaExplicit[0], ' ');
    }
  }

  // 3d. Mẫu "SYS trên/phần DIA": "135 trên 85", "135 phần 85"
  if (sys === undefined || dia === undefined) {
    const slashMatch = working.match(/\b(\d{2,3})\s*(?:trên|phần|gạch|chia)\s*(\d{2,3})\b/i);
    if (slashMatch) {
      const n1 = parseInt(slashMatch[1], 10);
      const n2 = parseInt(slashMatch[2], 10);
      if (n1 >= 60 && n1 <= 280 && n2 >= 30 && n2 <= 180) {
        sys = n1;
        dia = n2;
        working = working.replace(slashMatch[0], ' ');
      }
    }
  }

  // 4. Bắt các con số còn lại theo thứ tự xuất hiện: [SYS, DIA, PULSE]
  // Xử lý cả trường hợp nói liền 5 chữ số không dấu cách: "13585" -> 135 và 85
  working = working.replace(/\b(1\d{2}|2\d{2})(\d{2})\b/g, '$1 $2');

  const remainingNumbers: { value: number; rawMatch: string }[] = [];
  const numRegex = /\b(\d{2,3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = numRegex.exec(working)) !== null) {
    const v = parseInt(m[1], 10);
    if (v >= 25 && v <= 290) {
      remainingNumbers.push({ value: v, rawMatch: m[0] });
    }
  }

  for (const item of remainingNumbers) {
    const v = item.value;
    if (sys === undefined && v >= 65 && v <= 280) {
      sys = v;
      working = working.replace(new RegExp(`\\b${item.rawMatch}\\b`), ' ');
    } else if (dia === undefined && v >= 30 && v <= 180) {
      dia = v;
      working = working.replace(new RegExp(`\\b${item.rawMatch}\\b`), ' ');
    } else if (pulse === undefined && v >= 35 && v <= 230) {
      pulse = v;
      working = working.replace(new RegExp(`\\b${item.rawMatch}\\b`), ' ');
    }
  }

  // Nếu người đọc lỡ đọc số nhỏ (DIA) trước số lớn (SYS) (VD: "85 135")
  if (sys !== undefined && dia !== undefined && sys < dia && dia >= 90) {
    const temp = sys;
    sys = dia;
    dia = temp;
  }

  // 5. Trích xuất phần Ghi chú (Note) còn lại sau khi loại bỏ các từ nối chỉ huyết áp
  let noteClean = working
    .replace(
      /\b(huyết\s*áp|đo\s*được|kết\s*quả|chỉ\s*số|mmhg|milimet\s*thủy\s*ngân|trên|phần|gạch|mạch|nhịp\s*tim|nhịp|tim|tâm\s*thu|tâm\s*trương|số\s*trên|số\s*dưới|là|của\s*bố|bố|ghi\s*chú)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  // Viết hoa chữ cái đầu cho Ghi chú nếu có
  if (noteClean.length > 1) {
    noteClean = noteClean.charAt(0).toUpperCase() + noteClean.slice(1);
  } else {
    noteClean = '';
  }

  const isComplete = sys !== undefined && dia !== undefined;

  // Tạo chuỗi tóm tắt dễ hiểu
  const parts: string[] = [];
  if (sys !== undefined && dia !== undefined) {
    parts.push(`Huyết áp ${sys}/${dia} mmHg`);
  } else if (sys !== undefined) {
    parts.push(`Tâm thu (SYS): ${sys} (đang chờ số dưới...)`);
  }
  if (pulse !== undefined) {
    parts.push(`Mạch ${pulse}`);
  }
  if (period) {
    const periodMap: Record<VitalsPeriod, string> = {
      morning: 'Buổi sáng',
      noon: 'Buổi trưa',
      afternoon: 'Buổi chiều',
      evening: 'Buổi tối',
    };
    parts.push(periodMap[period]);
  }
  if (noteClean) {
    parts.push(`Ghi chú: "${noteClean}"`);
  }

  return {
    rawText,
    normalizedText,
    sys,
    dia,
    pulse,
    period,
    note: noteClean || undefined,
    autoSave,
    isComplete,
    summary: parts.join(' • '),
  };
}
