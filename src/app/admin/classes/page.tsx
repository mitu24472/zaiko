'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getClasses, addClass, updateClass, deleteClass } from '@/lib/firestore';
import { Class } from '@/lib/types';

export default function ClassesManagement() {
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
              <h1 className="text-xl font-semibold text-white">クラス管理</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex flex-wrap gap-4">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {showAddForm ? 'キャンセル' : '新しいクラスを追加'}
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              フィルタをクリア
            </button>
            <div className="text-sm text-gray-300 flex items-center px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
              表示中: <span className="text-blue-400 font-semibold mx-1">{filteredClasses.length}</span>件 / 全<span className="text-blue-400 font-semibold mx-1">{classes.length}</span>件
            </div>
          </div>

          {/* 検索・ソート */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-6 border border-gray-700">
            <h3 className="text-lg font-medium mb-4 text-white">検索・ソート</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-200 text-sm font-bold mb-2">
                  クラス名で検索
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded w-full py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="クラス名を入力"
                />
              </div>
              <div>
                <label className="block text-gray-200 text-sm font-bold mb-2">
                  ソート順
                </label>
                <button
                  onClick={handleSort}
                  className="bg-gray-700 border border-gray-600 rounded w-full py-3 px-4 text-left text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                >
                  クラス名 {getSortIcon()}
                </button>
              </div>
            </div>
          </div>

          {showAddForm && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-6 border border-gray-700">
              <form onSubmit={handleAdd}>
                <div className="mb-4">
                  <label className="block text-gray-200 text-sm font-bold mb-2">
                    クラス名
                  </label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded w-full py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="例: 1年A組"
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
              {filteredClasses.length === 0 ? (
                <li className="px-6 py-8 text-center text-gray-400">
                  <div className="text-4xl mb-4">🏫</div>
                  <p className="text-lg">
                    {classes.length === 0 ? 'クラスが登録されていません' : '条件に一致するクラスがありません'}
                  </p>
                </li>
              ) : (
                filteredClasses.map((classItem) => (
                  <li key={classItem.id} className="px-6 py-4 hover:bg-gray-700 transition-colors duration-200">
                    {editingClass?.id === classItem.id ? (
                      <form onSubmit={handleEdit} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingClass.name}
                          onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
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
                          onClick={() => setEditingClass(null)}
                          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          キャンセル
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-medium text-white">
                          {classItem.name}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingClass(classItem)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(classItem.id)}
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
