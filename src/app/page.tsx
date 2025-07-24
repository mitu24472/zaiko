'use client';

import { useEffect, useState } from 'react';
import { getItemAvailability } from '@/lib/firestore';

interface ItemAvailability {
  itemName: string;
  availableCount: number;
}

export default function Home() {
  const [items, setItems] = useState<ItemAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTime, setRefreshTime] = useState<string>('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">
            小石川創作展 物品貸出管理システム
          </h1>
          <p className="text-center text-gray-600 mb-6">
            各アイテムの利用可能数をリアルタイムで確認できます
          </p>
          <div className="text-center mb-6">
            <a 
              href="/admin/login" 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
            >
              管理者ログイン
            </a>
            <button
              onClick={fetchItems}
              disabled={loading}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? '更新中...' : '在庫を更新'}
            </button>
          </div>
          {refreshTime && (
            <p className="text-center text-sm text-gray-500">
              最終更新: {refreshTime}
            </p>
          )}
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">在庫状況</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-xl">読み込み中...</div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {items.length === 0 ? (
                  <li className="px-6 py-4 text-center text-gray-500">
                    アイテムが登録されていません
                  </li>
                ) : (
                  items.map((item, index) => (
                    <li key={index} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900">
                          {item.itemName}
                        </div>
                        <div className={`text-sm font-bold px-3 py-1 rounded-full ${
                          item.availableCount > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          利用可能: {item.availableCount}個
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>※ 貸出・返却により在庫数は変動します</p>
          <p>最新の情報を確認するには「在庫を更新」ボタンをクリックしてください</p>
        </div>
      </div>
    </div>
  )
}
