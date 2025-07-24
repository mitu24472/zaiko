'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">エラー</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            問題が発生しました
          </h2>
          <p className="text-gray-600 mb-8">
            {error.message || 'システムエラーが発生しました。'}
          </p>
          <div className="space-x-4">
            <button
              onClick={reset}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              再試行
            </button>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              トップページに戻る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
