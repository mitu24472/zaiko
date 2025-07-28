'use client';

import { useEffect, useState, useCallback } from 'react';
import { getItemAvailability } from '@/lib/firestore';

interface ItemAvailability {
  itemName: string;
  availableCount: number;
  totalCount: number;
  borrowedCount: number;
}

export default function Home() {
  const [items, setItems] = useState<ItemAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTime, setRefreshTime] = useState<string>('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const itemsData = await getItemAvailability();
      setItems(itemsData);
      setRefreshTime(new Date().toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
    } catch (error) {
      console.error('在庫情報の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-center text-white mb-6">
            創作展 貸出物品管理システム
          </h1>
          <p className="text-center text-gray-300 mb-8 text-lg">
            各物品の利用可能数をリアルタイムで確認できます
          </p>
          <div className="text-center mb-6">
            <a 
              href="/admin/login" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg mr-4 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 inline-block"
            >
              管理者ログイン
            </a>
            <button
              onClick={fetchItems}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 inline-flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>更新中...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>在庫を更新</span>
                </>
              )}
            </button>
          </div>
          {refreshTime && (
            <p className="text-center text-sm text-gray-400">
              最終更新: {refreshTime}
            </p>
          )}
        </div>

        <div className="bg-gray-800 shadow-xl overflow-hidden rounded-xl border border-gray-700">
          <div className="px-6 py-8 sm:p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">在庫状況</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-xl text-gray-300">読み込み中...</div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <div className="text-6xl mb-4">📦</div>
                    <p className="text-gray-400 text-lg">物品が登録されていません</p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-6 border border-gray-600 hover:bg-gray-600 transition-all duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">
                          {item.itemName}
                        </h3>
                        <div className={`text-2xl font-bold px-3 py-1 rounded-full ${
                          item.availableCount > 0 
                            ? 'bg-green-900/50 text-green-300 border border-green-700' 
                            : 'bg-red-900/50 text-red-300 border border-red-700'
                        }`}>
                          {item.availableCount}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-300">
                          <span>総数:</span>
                          <span className="text-blue-400 font-semibold">{item.totalCount}個</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>貸出中:</span>
                          <span className="text-yellow-400 font-semibold">{item.borrowedCount}個</span>
                        </div>
                      </div>
                      {item.totalCount > 0 && (
                        <div className="mt-4">
                          <div className="bg-gray-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                item.availableCount > 0 ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${(item.availableCount / item.totalCount) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-400 mt-2 text-center">
                            利用可能率: {Math.round((item.availableCount / item.totalCount) * 100)}%
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-400 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <p className="mb-2">※ 貸出・返却により在庫数は変動します</p>
          <p className="mb-4">最新の情報を確認するには「在庫を更新」ボタンをクリックしてください</p>
          <p>© 2025 創作展委員会/IT委員会</p>
        </div>
      </div>
    </div>
  )
}
