import type { NextPage } from 'next'

const Custom404: NextPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-600 mb-4">
          ページが見つかりません
        </h2>
        <p className="text-gray-500 mb-8">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <div className="space-x-4">
          <a
            href="/"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            ホームに戻る
          </a>
          <a
            href="/items"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            在庫確認
          </a>
        </div>
      </div>
    </div>
  )
}

export default Custom404
