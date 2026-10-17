import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
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
          borderRadius: '38px',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 78,
            lineHeight: 1,
            display: 'flex',
          }}
        >
          ❤️
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 24,
            fontWeight: 900,
            display: 'flex',
          }}
        >
          SỨC KHỎE BỐ
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
