'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-2xl font-bold mb-2">Đã xảy ra lỗi</h1>
      <p className="text-slate-400 mb-4">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer"
      >
        Thử lại
      </button>
    </div>
  );
}
