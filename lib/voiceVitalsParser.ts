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

// Các từ chỉ đóng vai trò hàng đơn vị sau hàng chục (không bao giờ mở đầu một số 2 chữ số mới)
const UNIT_ONLY_WORDS = new Set(['mốt', 'lăm', 'nhăm', 'rưỡi']);

/**
 * Tách một chuỗi chữ số dính liền (4..9 chữ số) do Google Speech-to-Text gộp lại
 * thành các chỉ số [SYS, DIA, PULSE] hoặc [DIA, PULSE] hợp lý về mặt sinh lý học.
 *
 * Ví dụ thực tế Google STT tiếng Việt rất hay trả về:
 * - "9663" (4 số: DIA 96 + Mạch 63) -> [96, 63]
 * - "9274" (4 số: DIA 92 + Mạch 74) -> [92, 74]
 * - "13696" (5 số: SYS 136 + DIA 96) -> [136, 96]
 * - "85102" (5 số: DIA 85 + Mạch 102) -> [85, 102]
 * - "1369663" (7 số: SYS 136 + DIA 96 + Mạch 63) -> [136, 96, 63]
 * - "13585102" (8 số: SYS 135 + DIA 85 + Mạch 102) -> [135, 85, 102]
 */
export function splitConcatenatedVitalDigits(digits: string): number[] | null {
  const len = digits.length;

  // 4 chữ số: [2 số, 2 số] (VD: "9663" -> 96, 63; "8578" -> 85, 78)
  if (len === 4) {
    const n1 = parseInt(digits.slice(0, 2), 10);
    const n2 = parseInt(digits.slice(2, 4), 10);
    if (n1 >= 30 && n1 <= 99 && n2 >= 30 && n2 <= 99) {
      return [n1, n2];
    }
    return null;
  }

  // 5 chữ số: [3 số, 2 số] (VD: "13696" -> 136, 96) hoặc [2 số, 3 số] (VD: "85102" -> 85, 102)
  if (len === 5) {
    const a1 = parseInt(digits.slice(0, 3), 10);
    const a2 = parseInt(digits.slice(3, 5), 10);
    if (a1 >= 100 && a1 <= 260 && a2 >= 35 && a2 <= 99) {
      return [a1, a2];
    }
    const b1 = parseInt(digits.slice(0, 2), 10);
    const b2 = parseInt(digits.slice(2, 5), 10);
    if (b1 >= 35 && b1 <= 99 && b2 >= 100 && b2 <= 220) {
      return [b1, b2];
    }
    return null;
  }

  // 6 chữ số: [3 số, 3 số] (VD: "150100" -> 150, 100) hoặc [2 số, 2 số, 2 số] (VD: "956072" -> 95, 60, 72)
  if (len === 6) {
    const a1 = parseInt(digits.slice(0, 3), 10);
    const a2 = parseInt(digits.slice(3, 6), 10);
    if (a1 >= 100 && a1 <= 260 && a2 >= 100 && a2 <= 220) {
      return [a1, a2];
    }
    const b1 = parseInt(digits.slice(0, 2), 10);
    const b2 = parseInt(digits.slice(2, 4), 10);
    const b3 = parseInt(digits.slice(4, 6), 10);
    if (b1 >= 65 && b1 <= 99 && b2 >= 35 && b2 <= 95 && b3 >= 35 && b3 <= 99) {
      return [b1, b2, b3];
    }
    return null;
  }

  // 7 chữ số: [3 số, 2 số, 2 số] (VD: "1369663" -> 136, 96, 63)
  if (len === 7) {
    const n1 = parseInt(digits.slice(0, 3), 10);
    const n2 = parseInt(digits.slice(3, 5), 10);
    const n3 = parseInt(digits.slice(5, 7), 10);
    if (n1 >= 100 && n1 <= 260 && n2 >= 35 && n2 <= 99 && n3 >= 35 && n3 <= 99) {
      return [n1, n2, n3];
    }
    return null;
  }

  // 8 chữ số: [3 số, 2 số, 3 số] (135 85 102) hoặc [3 số, 3 số, 2 số] (150 100 75)
  if (len === 8) {
    const a1 = parseInt(digits.slice(0, 3), 10);
    const a2 = parseInt(digits.slice(3, 5), 10);
    const a3 = parseInt(digits.slice(5, 8), 10);
    if (a1 >= 100 && a1 <= 260 && a2 >= 35 && a2 <= 99 && a3 >= 100 && a3 <= 220) {
      return [a1, a2, a3];
    }
    const b1 = parseInt(digits.slice(0, 3), 10);
    const b2 = parseInt(digits.slice(3, 6), 10);
    const b3 = parseInt(digits.slice(6, 8), 10);
    if (b1 >= 100 && b1 <= 260 && b2 >= 100 && b2 <= 180 && b3 >= 35 && b3 <= 99) {
      return [b1, b2, b3];
    }
    return null;
  }

  // 9 chữ số: [3 số, 3 số, 3 số] (150 100 105)
  if (len === 9) {
    const n1 = parseInt(digits.slice(0, 3), 10);
    const n2 = parseInt(digits.slice(3, 6), 10);
    const n3 = parseInt(digits.slice(6, 9), 10);
    if (n1 >= 100 && n1 <= 260 && n2 >= 100 && n2 <= 180 && n3 >= 100 && n3 <= 220) {
      return [n1, n2, n3];
    }
    return null;
  }

  return null;
}

/**
 * Chuyển các cụm từ chỉ số bằng chữ tiếng Việt (kể cả khẩu ngữ rút gọn và các biến thể
 * tách/gộp số của Google Speech-to-Text) sang chuỗi các số nguyên chuẩn cách nhau bởi dấu cách.
 */
export function convertVietnameseWordsToNumbers(input: string): string {
  let s = input.toLowerCase().trim();

  // 0. Xử lý dấu chấm/phẩy hàng nghìn do Google STT tiếng Việt tự động chèn
  // VD: "9.663" -> "9663", "13.696" -> "13696", "1.369.663" -> "1369663"
  s = s.replace(/\b(\d{1,3})[.,](\d{3})[.,](\d{3})\b/g, '$1$2$3');
  s = s.replace(/\b(\d{1,3})[.,](\d{3})\b/g, (full, p1, p2) => {
    const n1 = parseInt(p1, 10);
    const n2 = parseInt(p2, 10);
    // Nếu phần đầu < 40 (không thể là SYS/DIA) hoặc phần sau > 250 (không thể là DIA/Mạch),
    // đây chắc chắn là dấu phân cách hàng nghìn của STT (VD: "9.663", "13.696", "8.574")
    if (n1 < 40 || n2 > 250) {
      return `${p1}${p2}`;
    }
    return `${p1} ${p2}`;
  });

  // Chuẩn hóa dấu câu phân cách giữa các số
  s = s.replace(/\s*[/\\|-]\s*/g, ' trên ');
  s = s.replace(/[.,;:+]+/g, ' ');

  // 1. Xử lý các cụm khẩu ngữ đặc biệt "trăm rưỡi", "một trăm rưỡi"
  s = s.replace(/\b(?:một\s+)?trăm\s+rưỡi\b/g, '150');
  s = s.replace(/\b100\s+rưỡi\b/g, '150');

  // 2. Xử lý trường hợp STT biến "một trăm linh 5" thành "100 linh 5" hoặc "trăm lẻ 5"
  s = s.replace(/\b(?:100|(?:một\s+)?trăm)\s+(?:linh|lẻ)\s+(\d)\b/g, (_, d) =>
    String(100 + parseInt(d, 10))
  );
  s = s.replace(/\b(?:200|hai\s+trăm)\s+(?:linh|lẻ)\s+(\d)\b/g, (_, d) =>
    String(200 + parseInt(d, 10))
  );

  // 3. Xử lý trường hợp STT biến "một trăm" thành "100" rồi để chữ phía sau: "100 ba mươi lăm" -> "một trăm ba mươi lăm"
  s = s.replace(
    /\b100\s+(linh|lẻ|mười|một|mốt|hai|ba|bốn|tư|năm|lăm|sáu|bảy|bẩy|tám|chín)\b/g,
    'một trăm $1'
  );
  s = s.replace(
    /\b200\s+(linh|lẻ|mười|một|mốt|hai|ba|bốn|tư|năm|lăm|sáu|bảy|bẩy|tám|chín)\b/g,
    'hai trăm $1'
  );

  // 4. Xử lý trường hợp STT biến "trăm 35" -> "135", "một trăm 35" -> "135", "hai trăm 10" -> "210"
  s = s.replace(/\b(?:(một|hai)\s+)?trăm\s+(\d{1,2})\b/g, (_, hWord, tailDigits) => {
    const h = hWord === 'hai' ? 2 : 1;
    const tail = parseInt(tailDigits, 10);
    return String(h * 100 + tail);
  });

  // 5. Xử lý trường hợp STT trộn số hàng chục và chữ hàng đơn vị: "90 sáu" -> "96", "130 sáu" -> "136"
  s = s.replace(
    /\b([12]?\d0)\s+(một|mốt|hai|ba|bốn|tư|năm|lăm|nhăm|sáu|bảy|bẩy|tám|chín)\b/g,
    (full, tensStr, unitWord) => {
      const tensVal = parseInt(tensStr, 10);
      const unitVal = VI_DIGITS[unitWord];
      if (tensVal >= 20 && tensVal <= 240 && tensVal % 10 === 0 && tensVal !== 100 && tensVal !== 200 && unitVal !== undefined) {
        return String(tensVal + unitVal);
      }
      return full;
    }
  );

  // 6. Duyệt từng token để gom các cụm từ chỉ số tiếng Việt thành số
  const tokens = s.split(/\s+/).filter(Boolean);
  const out: string[] = [];

  const isDigitWord = (w: string) => Object.prototype.hasOwnProperty.call(VI_DIGITS, w);
  const isNumberMultiplier = (w: string) => w === 'trăm' || w === 'mươi' || w === 'chục';

  let i = 0;
  while (i < tokens.length) {
    const w = tokens[i];

    if (isDigitWord(w) || w === 'trăm' || w === 'mười') {
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

  // 7. Tách các chuỗi số 4..9 chữ số bị dính liền TRƯỚC (VD: "9663" -> "96 63", "1369663" -> "136 96 63")
  result = result.replace(/\b(\d{4,9})\b/g, (full, d) => {
    const split = splitConcatenatedVitalDigits(d);
    return split ? split.join(' ') : full;
  });

  // 8. Gộp các số bị Google STT tách rời:
  // 8a. "100 30 6" -> "136"
  result = result.replace(/\b(100|200)\s+([1-9]0)\s+([1-9])\b/g, (_, h, t, u) =>
    String(parseInt(h, 10) + parseInt(t, 10) + parseInt(u, 10))
  );

  // 8b. "130 6" -> "136", "90 6" -> "96", "60 3" -> "63" (số tròn chục + 1 chữ số đơn vị)
  result = result.replace(/\b(1[1-9]0|2[1-4]0|[2-9]0)\s+([1-9])\b/g, (_, tens, unit) =>
    String(parseInt(tens, 10) + parseInt(unit, 10))
  );

  // 8c. "100 35" -> "135"
  result = result.replace(
    /\b(100|200)\s+(\d{2})(?=\s+(?:trên|chên|trân|phần|gạch|chia|tâm\s+trương|số\s+dưới|\d{2,3})\b)/g,
    (_, hundreds, tens) => String(parseInt(hundreds, 10) + parseInt(tens, 10))
  );
  result = result.replace(/\b(100|200)\s+([1-3]\d|4[0-4])\b/g, (_, hundreds, tens) =>
    String(parseInt(hundreds, 10) + parseInt(tens, 10))
  );

  // 8d. Gộp các chữ số đơn lẻ bị STT tách rời:
  // VD: "1 3 6" -> "136", "1 36" -> "136", "13 6" -> "136", "9 6" -> "96", "6 3" -> "63"
  result = reconstructSpacedDigits(result);

  // 9. Chạy lại bước tách 4..9 chữ số một lần nữa phòng trường hợp sau khi gộp tạo thành chuỗi dài
  result = result.replace(/\b(\d{4,9})\b/g, (full, d) => {
    const split = splitConcatenatedVitalDigits(d);
    return split ? split.join(' ') : full;
  });

  return result;
}

/**
 * Gộp các chữ số rời rạc do Google STT tách ra khi đọc từng chữ số:
 * - "1 3 6 9 6 6 3" -> "136 96 63"
 * - "136 9 6 6 3" -> "136 96 63"
 * - "1 36 96 63" -> "136 96 63"
 * - "13 6 96 63" -> "136 96 63"
 */
function reconstructSpacedDigits(text: string): string {
  const tokens = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let i = 0;

  const isSingleDigit = (t: string | undefined): boolean => Boolean(t && /^\d$/.test(t));
  const isTwoDigits = (t: string | undefined): boolean => Boolean(t && /^\d{2}$/.test(t));

  while (i < tokens.length) {
    const t0 = tokens[i];
    const t1 = tokens[i + 1];
    const t2 = tokens[i + 2];

    // Mẫu 1: "1" hoặc "2" + 2 chữ số (VD: "1 36" -> "136")
    if ((t0 === '1' || t0 === '2') && isTwoDigits(t1)) {
      out.push(`${t0}${t1}`);
      i += 2;
      continue;
    }

    // Mẫu 2: Số 2 chữ số nhỏ (< 28, không thể là huyết áp/mạch) + 1 chữ số (VD: "13 6" -> "136")
    if (isTwoDigits(t0) && parseInt(t0, 10) <= 26 && isSingleDigit(t1)) {
      out.push(`${t0}${t1}`);
      i += 2;
      continue;
    }

    // Mẫu 3: "1" hoặc "2" + 1 chữ số + 1 chữ số (VD: "1 3 6" -> "136")
    if ((t0 === '1' || t0 === '2') && isSingleDigit(t1) && isSingleDigit(t2)) {
      out.push(`${t0}${t1}${t2}`);
      i += 3;
      continue;
    }

    // Mẫu 4: 2 chữ số đơn liên tiếp tạo thành số 2 chữ số >= 30 (VD: "9 6" -> "96", "6 3" -> "63")
    if (isSingleDigit(t0) && parseInt(t0, 10) >= 3 && isSingleDigit(t1)) {
      out.push(`${t0}${t1}`);
      i += 2;
      continue;
    }

    out.push(t0);
    i += 1;
  }

  return out.join(' ');
}

/**
 * Đếm số từ chỉ chữ số liên tiếp từ vị trí startIdx (không tính 'trăm', 'mươi', 'chục', 'mười')
 */
function countTrailingPlainDigits(words: string[], startIdx: number): number {
  let count = 0;
  for (let k = startIdx; k < words.length; k++) {
    const w = words[k];
    if (
      Object.prototype.hasOwnProperty.call(VI_DIGITS, w) &&
      w !== 'linh' &&
      w !== 'lẻ'
    ) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Kiểm tra xem từ ở vị trí unitIdx sau "mươi"/"chục" có thực sự là hàng đơn vị của số hiện tại,
 * hay là hàng chục mở đầu cho một số 2 chữ số tiếp theo (VD: "ba mươi chín sáu" -> 30 và 96).
 */
function shouldConsumeUnitAfterMuoi(words: string[], unitIdx: number): boolean {
  const wUnit = words[unitIdx];
  if (!wUnit || VI_DIGITS[wUnit] === undefined || wUnit === 'linh' || wUnit === 'lẻ') {
    return false;
  }

  const wNext = words[unitIdx + 1];
  // Nếu ngay sau wUnit là "mươi" / "chục" / "trăm" (VD: "ba mươi chín mươi sáu"),
  // thì wUnit ("chín") thuộc về "chín mươi sáu" chứ không phải "ba mươi chín"!
  if (wNext === 'mươi' || wNext === 'chục' || wNext === 'trăm') {
    return false;
  }

  // Nếu wUnit là từ chỉ đứng ở hàng đơn vị ("mốt", "lăm", "nhăm", "rưỡi"), chắc chắn thuộc số hiện tại
  if (UNIT_ONLY_WORDS.has(wUnit)) {
    return true;
  }

  // Nếu sau wUnit là một chuỗi chữ số rút gọn có tổng độ dài (tính cả wUnit) là số chẵn (2 hoặc 4 từ, VD: "chín sáu" hoặc "chín sáu sáu ba")
  // và wUnit >= 3 (có thể làm hàng chục của số 2 chữ số >= 30), thì wUnit mở đầu số mới!
  const plainCount = countTrailingPlainDigits(words, unitIdx);
  if (plainCount >= 2 && plainCount % 2 === 0 && VI_DIGITS[wUnit] >= 3) {
    return false;
  }

  return true;
}

/**
 * Phân tích một mảng các từ chỉ số liên tiếp thành 1 hoặc nhiều số nguyên.
 */
function parseVietnameseNumberPhrase(words: string[]): number[] {
  const results: number[] = [];
  let idx = 0;

  while (idx < words.length) {
    const w0 = words[idx];
    const w1 = words[idx + 1];
    const w2 = words[idx + 2];

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
      if (
        w1 &&
        VI_DIGITS[w1] !== undefined &&
        w1 !== 'linh' &&
        w1 !== 'lẻ' &&
        w2 !== 'mươi' &&
        w2 !== 'chục'
      ) {
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
      if (shouldConsumeUnitAfterMuoi(words, idx + 2)) {
        results.push(tens + VI_DIGITS[w2]);
        idx += 3;
      } else {
        results.push(tens);
        idx += 2;
      }
      continue;
    }

    // Mẫu E: Đọc từng chữ số kiểu "một ba lăm" (135) hoặc "một ba sáu" (136)
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
      if (shouldConsumeUnitAfterMuoi(words, idx + 3)) {
        results.push(base + VI_DIGITS[words[idx + 3]]);
        idx += 4;
      } else {
        results.push(base);
        idx += 3;
      }
      continue;
    }

    // Mẫu G: Đọc rút gọn 2 chữ số kiểu "tám lăm" (85), "bảy tư" (74), "chín sáu" (96), "sáu ba" (63)
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

    idx += 1;
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

  if (!w0) {
    return { value: hundredsBase, nextIdx: startIdx };
  }

  // "trăm linh năm" / "trăm lẻ năm" -> 105
  if ((w0 === 'linh' || w0 === 'lẻ') && w1 && VI_DIGITS[w1] !== undefined) {
    return { value: hundredsBase + VI_DIGITS[w1], nextIdx: startIdx + 2 };
  }

  // "trăm mười" / "trăm mười lăm" -> 110 / 115
  if (w0 === 'mười') {
    if (
      w1 &&
      VI_DIGITS[w1] !== undefined &&
      w1 !== 'linh' &&
      w1 !== 'lẻ' &&
      w2 !== 'mươi' &&
      w2 !== 'chục'
    ) {
      return { value: hundredsBase + 10 + VI_DIGITS[w1], nextIdx: startIdx + 2 };
    }
    return { value: hundredsBase + 10, nextIdx: startIdx + 1 };
  }

  // "trăm ba mươi lăm" / "trăm ba mươi"
  if (VI_DIGITS[w0] >= 1 && VI_DIGITS[w0] <= 9 && (w1 === 'mươi' || w1 === 'chục')) {
    const tens = VI_DIGITS[w0] * 10;
    if (shouldConsumeUnitAfterMuoi(words, startIdx + 2)) {
      return { value: hundredsBase + tens + VI_DIGITS[w2], nextIdx: startIdx + 3 };
    }
    return { value: hundredsBase + tens, nextIdx: startIdx + 2 };
  }

  // "trăm ba lăm" / "trăm ba sáu" (khuyết chữ "mươi")
  // Phân biệt với "trăm ba tám lăm" (130, 85 - có 3 chữ số theo sau "trăm")
  // hoặc "trăm ba chín sáu sáu ba" (130, 96, 63 - có 5 chữ số theo sau "trăm", và chữ số thứ 2 >= 4):
  const isShorthandTensOnly = w0 === 'tư' || w0 === 'mốt' || w0 === 'rưỡi';
  const plainDigitsCount = countTrailingPlainDigits(words, startIdx);
  const isRoundHundredTenFollowedByPairs =
    plainDigitsCount === 3 ||
    (plainDigitsCount === 5 && w1 !== undefined && !UNIT_ONLY_WORDS.has(w1) && VI_DIGITS[w1] >= 4);

  if (
    !isShorthandTensOnly &&
    !isRoundHundredTenFollowedByPairs &&
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
  // 3a. Mạch / Nhịp tim (hỗ trợ cả các từ đồng âm Google STT hay nghe nhầm từ "mạch" -> "mặt", "mắc", "mạnh", "mạc")
  const pulseExplicit = working.match(
    /\b(?:mạch|mặt|mắc|mạnh|mạc|mạt|mách|bạch|vạch|nhịp\s*tim|nhịp|tim|pulse)\s*(?:là\s*)?(\d{2,3})\b/i
  );
  if (pulseExplicit) {
    const val = parseInt(pulseExplicit[1], 10);
    if (val >= 35 && val <= 240) {
      pulse = val;
      working = working.replace(pulseExplicit[0], ' ');
    }
  } else {
    const pulseSuffix = working.match(
      /\b(\d{2,3})\s*(?:nhịp\s*trên\s*phút|nhịp\/phút|lần\s*trên\s*phút|bpm|nhịp)\b/i
    );
    if (pulseSuffix) {
      const val = parseInt(pulseSuffix[1], 10);
      if (val >= 35 && val <= 240) {
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
    if (val >= 65 && val <= 280) {
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

  // 3d. Mẫu "SYS trên/phần DIA": "135 trên 85", "135 phần 85" (kể cả STT nghe nhầm "trên" -> "chên", "trân")
  if (sys === undefined || dia === undefined) {
    const slashMatch = working.match(
      /\b(\d{2,3})\s*(?:trên|chên|trân|phần|gạch|chia)\s*(\d{2,3})\b/i
    );
    if (slashMatch) {
      const n1 = parseInt(slashMatch[1], 10);
      const n2 = parseInt(slashMatch[2], 10);
      if (n1 >= 65 && n1 <= 280 && n2 >= 30 && n2 <= 180) {
        sys = n1;
        dia = n2;
        working = working.replace(slashMatch[0], ' ');
      }
    }
  }

  // 4. Bắt tất cả các con số còn lại theo thứ tự xuất hiện: [SYS, DIA, PULSE]
  // Loại bỏ các số trùng lặp liền kề (do người đọc lặp lại hoặc do Android Chrome lặp kết quả)
  const rawRemainingNumbers: number[] = [];
  const numRegex = /\b(\d{2,3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = numRegex.exec(working)) !== null) {
    const v = parseInt(m[1], 10);
    if (v >= 25 && v <= 290) {
      if (
        rawRemainingNumbers.length === 0 ||
        rawRemainingNumbers[rawRemainingNumbers.length - 1] !== v
      ) {
        rawRemainingNumbers.push(v);
      }
    }
  }

  for (const v of rawRemainingNumbers) {
    if (sys === undefined && v >= 65 && v <= 280) {
      sys = v;
    } else if (dia === undefined && v >= 30 && v <= 180 && (sys === undefined || v < sys)) {
      dia = v;
    } else if (pulse === undefined && v >= 35 && v <= 230) {
      pulse = v;
    }
  }

  // Nếu người đọc lỡ đọc số nhỏ (DIA) trước số lớn (SYS) (VD: "85 135")
  if (sys !== undefined && dia !== undefined && sys < dia && dia >= 90) {
    const temp = sys;
    sys = dia;
    dia = temp;
  }

  // 5. Trích xuất phần Ghi chú (Note) còn lại:
  // QUAN TRỌNG: Xóa sạch MỌI chữ số (\d+) và các từ khóa/từ đệm đọc số để chữ số KHÔNG BAO GIỜ bị đẩy nhầm vào ô Ghi chú!
  let noteClean = working
    .replace(/\b\d+\b/g, ' ')
    .replace(
      /\b(huyết\s*áp|đo\s*được|kết\s*quả|chỉ\s*số|mmhg|milimet\s*thủy\s*ngân|trên|chên|trân|phần|gạch|chia|mạch|mặt|mắc|mạnh|mạc|mạt|mách|bạch|vạch|nhịp\s*tim|nhịp|tim|tâm\s*thu|tâm\s*trương|số\s*trên|số\s*dưới|số\s*cao|số\s*thấp|lần|phút|bpm|là|của\s*bố|bố|ghi\s*chú|không|linh|lẻ|một|mốt|hai|ba|bốn|tư|năm|lăm|nhăm|rưỡi|sáu|bảy|bẩy|tám|chín|mười|mươi|chục|trăm|nhé|nha|ạ|ơi|rồi|xong)\b/gi,
      ' '
    )
    .replace(/[^\p{L}\p{N}\s,.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Chỉ giữ lại Ghi chú nếu thực sự có từ ngữ mô tả có nghĩa (>= 3 ký tự chữ cái)
  const letterCount = (noteClean.match(/\p{L}/gu) || []).length;
  if (letterCount >= 3) {
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
