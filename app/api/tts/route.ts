import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Tách đoạn văn tiếng Việt dài thành các câu/cụm ngắn (<= 175 ký tự)
 * để Google TTS đọc liền mạch, tự nhiên không bị ngắt từ.
 */
function splitVietnameseTextIntoChunks(text: string, maxLen = 175): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const chunks: string[] = [];
  // Tách ưu tiên theo dấu chấm, chấm phẩy, hai chấm, dấu phẩy
  const rawParts = cleaned.split(/(?<=[.!?;:,])\s+/);
  let current = '';

  for (const part of rawParts) {
    if (!part) continue;
    if ((current ? `${current} ${part}` : part).length <= maxLen) {
      current = current ? `${current} ${part}` : part;
    } else {
      if (current) {
        chunks.push(current);
        current = '';
      }
      if (part.length <= maxLen) {
        current = part;
      } else {
        // Nếu 1 câu đơn quá dài -> tách theo khoảng trắng
        const words = part.split(' ');
        for (const w of words) {
          if ((current ? `${current} ${w}` : w).length <= maxLen) {
            current = current ? `${current} ${w}` : w;
          } else {
            if (current) chunks.push(current);
            current = w;
          }
        }
      }
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}

export async function GET(req: NextRequest) {
  try {
    const rawText = req.nextUrl.searchParams.get('text') || '';
    const trimmed = rawText.trim().slice(0, 1200);
    if (!trimmed) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const chunks = splitVietnameseTextIntoChunks(trimmed, 175);
    const audioBuffers: Uint8Array[] = [];

    for (const chunk of chunks) {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(
        chunk
      )}`;
      const res = await fetch(ttsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`TTS upstream error: ${res.status}`);
      }

      const arrBuf = await res.arrayBuffer();
      if (arrBuf.byteLength > 0) {
        audioBuffers.push(new Uint8Array(arrBuf));
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ error: 'Empty audio' }, { status: 502 });
    }

    const totalLength = audioBuffers.reduce((acc, b) => acc + b.byteLength, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      merged.set(buf, offset);
      offset += buf.byteLength;
    }

    return new NextResponse(merged, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(totalLength),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('[TTS API Error]:', err);
    return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 500 });
  }
}
