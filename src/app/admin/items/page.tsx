'use client';

import { useEffect, useState } from 'react';
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
  }, [router]);

  const fetchItems = async () => {
    try {
      const itemsData = await getItems();
      setItems(itemsData);
    } catch (error) {
      console.error('アイテムの一覧の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

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
    return <div className="flex justify-center items-center h-screen">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/admin/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">
                ← ダッシュボードに戻る
              </a>
              <h1 className="text-xl font-semibold">アイテムの種類管理</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {showAddForm ? 'キャンセル' : '新しいアイテムの種類を追加'}
            </button>
          </div>

          {showAddForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <form onSubmit={handleAdd}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    アイテムの種類名
                  </label>
                  <input
                    type="text"
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="ここにアイテムの種類名を入力"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <li className="px-6 py-4 text-center text-gray-500">
                  アイテムの種類が登録されていません
                </li>
              ) : (
                items.map((item) => (
                  <li key={item.id} className="px-6 py-4">
                    {editingItem?.id === item.id ? (
                      <form onSubmit={handleEdit} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingItem.label}
                          onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                          className="flex-1 shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          required
                        />
                        <button
                          type="submit"
                          className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItem(null)}
                          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded"
                        >
                          キャンセル
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900">
                          {item.label}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
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
