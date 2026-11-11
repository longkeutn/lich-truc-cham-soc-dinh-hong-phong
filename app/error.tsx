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
      <h1 className="text-2xl font-bold mb-2 text-slate-900">Đã xảy ra lỗi</h1>
      <p className="text-slate-600 mb-4">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="min-h-[48px] min-w-[48px] px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer transition"
      >
        Thử lại
      </button>
    </div>
  );
}
