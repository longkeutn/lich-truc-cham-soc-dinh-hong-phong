import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Chia văn bản dài (ví dụ: đọc toàn bộ danh sách nhắc nhở trong ngày)
 * thành các đoạn câu <= 180 ký tự để tạo luồng MP3 liền mạch không giới hạn độ dài.
 */
function splitTextIntoChunks(text: string, maxLen: number = 180): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  // Tách theo dấu chấm, chấm than, chấm hỏi, chấm phẩy trước
  const rawSentences = cleaned.split(/(?<=[.!?;])\s+/);
  const chunks: string[] = [];
  let current = '';

  const pushOrSplitLongPiece = (piece: string) => {
    const words = piece.split(' ');
    let sub = '';
    for (const w of words) {
      if (!sub) {
        sub = w;
      } else if (sub.length + 1 + w.length <= maxLen) {
        sub += ' ' + w;
      } else {
        chunks.push(sub);
        sub = w;
      }
    }
    if (sub) chunks.push(sub);
  };

  for (const sentence of rawSentences) {
    if (!sentence) continue;
    if (sentence.length > maxLen) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      pushOrSplitLongPiece(sentence);
    } else if (!current) {
      current = sentence;
    } else if (current.length + 1 + sentence.length <= maxLen) {
      current += ' ' + sentence;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.slice(0, 15); // Tối đa 15 đoạn (~2.700 ký tự) cho 1 lần đọc
}

/**
 * Proxy phát giọng đọc tiếng Việt tự nhiên (0 API Key, 0 chi phí AI).
 * Hỗ trợ ghép nối nhiều đoạn câu thành 1 file MP3 duy nhất để đọc được cả danh sách nhắc nhở dài trên điện thoại.
 */
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get('text')?.trim() || '';
  if (!text || text.length > 2800) {
    return new NextResponse('Invalid text', { status: 400 });
  }

  try {
    const chunks = splitTextIntoChunks(text, 180);
    if (chunks.length === 0) {
      return new NextResponse('Empty text', { status: 400 });
    }

    const buffers = await Promise.all(
      chunks.map(async (chunk) => {
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(
          chunk
        )}`;
        const res = await fetch(ttsUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        if (!res.ok) {
          throw new Error(`Upstream TTS status ${res.status}`);
        }
        return new Uint8Array(await res.arrayBuffer());
      })
    );

    const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of buffers) {
      merged.set(b, offset);
      offset += b.byteLength;
    }

    return new NextResponse(merged, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return new NextResponse('TTS error', { status: 500 });
  }
}
