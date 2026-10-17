import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
          borderRadius: '112px',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 220,
            lineHeight: 1,
            display: 'flex',
          }}
        >
          ❤️
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 68,
            fontWeight: 900,
            letterSpacing: '-1px',
            display: 'flex',
          }}
        >
          SỨC KHỎE BỐ
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}
