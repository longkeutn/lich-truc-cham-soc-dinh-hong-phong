import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Proxy phát giọng đọc tiếng Việt tự nhiên (0 API Key, 0 chi phí AI).
 * Giải quyết triệt để lỗi điện thoại iPhone / Samsung / Xiaomi không có sẵn gói giọng đọc tiếng Việt (vi-VN)
 * trong window.speechSynthesis khiến máy bị câm khi đọc lại chỉ số huyết áp.
 */
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get('text')?.trim() || '';
  if (!text || text.length > 250) {
    return new NextResponse('Invalid text', { status: 400 });
  }

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(
      text
    )}`;

    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse('TTS upstream error', { status: 502 });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
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
