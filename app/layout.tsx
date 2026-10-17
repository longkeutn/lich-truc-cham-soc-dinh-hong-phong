import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#e11d48',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Sổ Sức Khỏe Bố - Đinh Hồng Phong',
  description:
    'Ứng dụng theo dõi sức khỏe hàng ngày cho bố Đinh Hồng Phong: ghi huyết áp, quản lý thuốc & bài tập phục hồi chức năng, lịch tái khám (tích hợp Google Sheets thời gian thực)',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sức Khỏe Bố',
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
    title: 'Sổ Sức Khỏe Bố - Đinh Hồng Phong',
    description: 'Theo dõi huyết áp, thuốc & phục hồi chức năng hàng ngày cho bố Đinh Hồng Phong',
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
