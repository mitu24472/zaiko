'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getClasses, addClass, updateClass, deleteClass } from '@/lib/firestore';
import { Class } from '@/lib/types';

export default function ClassesManagement() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const router = useRouter();

  useEffect(() => {
    const adminData = sessionStorage.getItem('admin');
    if (!adminData) {
      router.push('/admin/login');
      return;
    }

    fetchClasses();
  }, [router]);

  // フィルタとソート機能
  useEffect(() => {
    let filtered = [...classes];

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(classItem => 
        classItem.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ソート
    filtered.sort((a, b) => {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
    });

    setFilteredClasses(filtered);
  }, [classes, searchTerm, sortDirection]);

  const handleSort = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const getSortIcon = () => {
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSortDirection('asc');
  };

  const fetchClasses = async () => {
    try {
      const classesData = await getClasses();
      setClasses(classesData);
    } catch (error) {
      console.error('クラス一覧の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      await addClass(newClassName.trim());
      setNewClassName('');
      setShowAddForm(false);
      await fetchClasses();
    } catch (error) {
      console.error('クラスの追加に失敗しました:', error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editingClass.name.trim()) return;

    try {
      await updateClass(editingClass.id, editingClass.name.trim());
      setEditingClass(null);
      await fetchClasses();
    } catch (error) {
      console.error('クラスの更新に失敗しました:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このクラスを削除しますか？')) return;

    try {
      await deleteClass(id);
      await fetchClasses();
    } catch (error) {
      console.error('クラスの削除に失敗しました:', error);
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
              <h1 className="text-xl font-semibold">クラス管理</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex flex-wrap gap-4">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {showAddForm ? 'キャンセル' : '新しいクラスを追加'}
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              フィルタをクリア
            </button>
            <div className="text-sm text-gray-600 flex items-center">
              表示中: {filteredClasses.length}件 / 全{classes.length}件
            </div>
          </div>

          {/* 検索・ソート */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-medium mb-4">検索・ソート</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  クラス名で検索
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="例: 1年A組"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  ソート順
                </label>
                <button
                  onClick={handleSort}
                  className="shadow border rounded w-full py-2 px-3 text-left hover:bg-gray-50 focus:outline-none focus:shadow-outline"
                >
                  クラス名 {getSortIcon()}
                </button>
              </div>
            </div>
          </div>

          {showAddForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <form onSubmit={handleAdd}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    クラス名
                  </label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="例: 1年A組"
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
              {filteredClasses.length === 0 ? (
                <li className="px-6 py-4 text-center text-gray-500">
                  {classes.length === 0 ? 'クラスが登録されていません' : '条件に一致するクラスがありません'}
                </li>
              ) : (
                filteredClasses.map((classItem) => (
                  <li key={classItem.id} className="px-6 py-4">
                    {editingClass?.id === classItem.id ? (
                      <form onSubmit={handleEdit} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingClass.name}
                          onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
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
                          onClick={() => setEditingClass(null)}
                          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded"
                        >
                          キャンセル
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900">
                          {classItem.name}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingClass(classItem)}
                            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(classItem.id)}
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
