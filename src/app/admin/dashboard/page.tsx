'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Admin } from '@/lib/types';

export default function AdminDashboard() {
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
      if (document.head.contains(metaRobots)) {
        document.head.removeChild(metaRobots);
      }
      if (document.head.contains(metaGooglebot)) {
        document.head.removeChild(metaGooglebot);
      }
    };
  }, []);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const router = useRouter();

  useEffect(() => {
    const adminData = sessionStorage.getItem('admin');
    if (adminData) {
      setAdmin(JSON.parse(adminData));
    } else {
      router.push('/admin/login');
    }
  }, []); // routerの依存を削除

  const handleLogout = () => {
    sessionStorage.removeItem('admin');
    router.push('/admin/login');
  };

  if (!admin) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-xl border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">管理者ダッシュボード</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">こんにちは、{admin.name}さん</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* クラス管理 */}
            <div className="bg-gray-800 overflow-hidden shadow-xl rounded-xl border border-gray-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">C</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">
                        クラス管理
                      </dt>
                      <dd className="text-lg font-semibold text-white">
                        クラスの追加・編集・削除
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-6">
                  <a
                    href="/admin/classes"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center block transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    クラス管理へ
                  </a>
                </div>
              </div>
            </div>

            {/* アイテム種別管理 */}
            <div className="bg-gray-800 overflow-hidden shadow-xl rounded-xl border border-gray-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">I</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">
                        物品種別管理
                      </dt>
                      <dd className="text-lg font-semibold text-white">
                        物品種別の追加・編集・削除
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-6">
                  <a
                    href="/admin/items"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg text-center block transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    物品管理へ
                  </a>
                </div>
              </div>
            </div>

            {/* アイテム管理 */}
            <div className="bg-gray-800 overflow-hidden shadow-xl rounded-xl border border-gray-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">S</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">
                        在庫管理
                      </dt>
                      <dd className="text-lg font-semibold text-white">
                        貸出・返却・在庫管理
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-6">
                  <a
                    href="/admin/instances"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg text-center block transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    在庫管理へ
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
