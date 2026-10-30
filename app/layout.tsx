import type { Metadata, Viewport } from 'next';
import { APP_TITLE, APP_SHORT_TITLE } from '@/lib/config';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#e11d48',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: APP_TITLE,
  description:
    'Ứng dụng theo dõi sức khỏe hàng ngày cho gia đình: ghi huyết áp, quản lý thuốc & sinh hoạt, lịch tái khám (đồng bộ Google Sheets thời gian thực)',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_SHORT_TITLE,
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: APP_TITLE,
    description: 'Theo dõi huyết áp, thuốc & chăm sóc sức khỏe hàng ngày cho gia đình',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
