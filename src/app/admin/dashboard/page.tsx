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
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin');
    router.push('/admin/login');
  };

  if (!admin) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">管理者ダッシュボード</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">こんにちは、{admin.name}さん</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* クラス管理 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">C</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        クラス管理
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        クラスの追加・編集・削除
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-5">
                  <a
                    href="/admin/classes"
                    className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-center block"
                  >
                    クラス管理へ
                  </a>
                </div>
              </div>
            </div>

            {/* アイテム種別管理 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">I</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        物品種別管理
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        物品種別の追加・編集・削除
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-5">
                  <a
                    href="/admin/items"
                    className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-center block"
                  >
                    物品管理へ
                  </a>
                </div>
              </div>
            </div>

            {/* アイテム管理 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">S</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        在庫管理
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        貸出・返却・在庫管理
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-5">
                  <a
                    href="/admin/instances"
                    className="w-full bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded text-center block"
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
