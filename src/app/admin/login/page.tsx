'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateAdmin } from '@/lib/auth';

export default function AdminLogin() {
  useEffect(() => {
    // メタタグを動的に設定
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow';
    document.head.appendChild(metaRobots);

    const metaGooglebot = document.createElement('meta');
    metaGooglebot.name = 'googlebot';
    metaGooglebot.content = 'noindex, nofollow';
    document.head.appendChild(metaGooglebot);

    // クリーンアップ
    return () => {
      document.head.removeChild(metaRobots);
      document.head.removeChild(metaGooglebot);
    };
  }, []);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const admin = await authenticateAdmin(name, password);
      if (admin) {
        // 認証成功 - セッションストレージに保存
        sessionStorage.setItem('admin', JSON.stringify(admin));
        router.push('/admin/dashboard');
      } else {
        setError('ユーザー名またはパスワードが間違っています');
      }
    } catch (error) {
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-white">
            管理者ログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            創作展 物品貸出管理システム
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                ユーザー名
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="ユーザー名を入力"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ログイン中...
                  </div>
                ) : (
                  'ログイン'
                )}
              </button>
              <a
                href="/"
                className="w-full flex justify-center py-3 px-4 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                トップページに戻る
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
