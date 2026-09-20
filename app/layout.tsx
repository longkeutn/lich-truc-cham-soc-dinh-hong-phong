import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lịch Trực Chăm Sóc - Đinh Hồng Phong',
  description: 'Ứng dụng điều phối ca trực chăm sóc bệnh nhân tai biến nặng Đinh Hồng Phong (7 thành viên gia đình, tích hợp Google Sheets thời gian thực)',
  openGraph: {
    title: 'Lịch Trực Chăm Sóc - Đinh Hồng Phong',
    description: 'Ứng dụng điều phối ca trực chăm sóc bệnh nhân tai biến nặng Đinh Hồng Phong',
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
