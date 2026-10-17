import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sổ Sức Khỏe Bố - Đinh Hồng Phong',
  description: 'Ứng dụng theo dõi sức khỏe hàng ngày cho bố Đinh Hồng Phong: ghi huyết áp, quản lý thuốc & bài tập phục hồi chức năng, lịch tái khám (tích hợp Google Sheets thời gian thực)',
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
