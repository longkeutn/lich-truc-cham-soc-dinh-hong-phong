import { ImageResponse } from 'next/og';
import { APP_ICON_CONFIG } from '@/lib/config';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  const { gradientStart, gradientEnd, emoji, label } = APP_ICON_CONFIG;
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
          background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
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
          {emoji}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: label.length > 11 ? 20 : 23,
            fontWeight: 900,
            letterSpacing: '-0.5px',
            display: 'flex',
          }}
        >
          {label}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
