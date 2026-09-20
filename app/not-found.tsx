import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-2xl font-bold mb-2">404 - Không tìm thấy trang</h1>
      <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
        Quay lại trang chủ
      </Link>
    </div>
  );
}
