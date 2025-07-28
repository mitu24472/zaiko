'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getItems, addItem, updateItem, deleteItem } from '@/lib/firestore';
import { Item } from '@/lib/types';

export default function ItemsManagement() {
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
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const adminData = sessionStorage.getItem('admin');
    if (!adminData) {
      router.push('/admin/login');
      return;
    }

    fetchItems();
  }, []); // routerの依存を削除

  const fetchItems = useCallback(async () => {
    try {
      const itemsData = await getItems();
      setItems(itemsData);
    } catch (error) {
      console.error('アイテムの一覧の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabel.trim()) return;

    try {
      await addItem(newItemLabel.trim());
      setNewItemLabel('');
      setShowAddForm(false);
      await fetchItems();
    } catch (error) {
      console.error('アイテムの追加に失敗しました:', error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.label.trim()) return;

    try {
      await updateItem(editingItem.id, editingItem.label.trim());
      setEditingItem(null);
      await fetchItems();
    } catch (error) {
      console.error('アイテムの更新に失敗しました:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このアイテムの種類を削除しますか？')) return;

    try {
      await deleteItem(id);
      await fetchItems();
    } catch (error) {
      console.error('アイテムの削除に失敗しました:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-xl text-white">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <nav className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/admin/dashboard" className="text-blue-400 hover:text-blue-300 mr-4 transition-colors duration-200">
                ← ダッシュボードに戻る
              </a>
              <h1 className="text-xl font-semibold text-white">アイテムの種類管理</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {showAddForm ? 'キャンセル' : '新しいアイテムの種類を追加'}
            </button>
          </div>

          {showAddForm && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-6 border border-gray-700">
              <form onSubmit={handleAdd}>
                <div className="mb-4">
                  <label className="block text-gray-200 text-sm font-bold mb-2">
                    アイテムの種類名
                  </label>
                  <input
                    type="text"
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded w-full py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="ここにアイテムの種類名を入力"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-gray-800 shadow-xl overflow-hidden rounded-xl border border-gray-700">
            <ul className="divide-y divide-gray-700">
              {items.length === 0 ? (
                <li className="px-6 py-8 text-center text-gray-400">
                  <div className="text-4xl mb-4">📦</div>
                  <p className="text-lg">アイテムの種類が登録されていません</p>
                </li>
              ) : (
                items.map((item) => (
                  <li key={item.id} className="px-6 py-4 hover:bg-gray-700 transition-colors duration-200">
                    {editingItem?.id === item.id ? (
                      <form onSubmit={handleEdit} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingItem.label}
                          onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          required
                        />
                        <button
                          type="submit"
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItem(null)}
                          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          キャンセル
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-medium text-white">
                          {item.label}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
