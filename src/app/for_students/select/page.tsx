'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getClasses } from '@/lib/firestore';

interface Class {
  id: string;
  name: string;
}

export default function Select() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [action, setAction] = useState<'borrow' | 'return' | ''>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 学生認証チェック
    const studentData = sessionStorage.getItem('student');
    if (!studentData) {
      router.push('/for_students/login');
      return;
    }

    fetchClasses();
  }, []); // routerの依存を削除

  const fetchClasses = useCallback(async () => {
    try {
      const classesData = await getClasses();
      setClasses(classesData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('クラス情報の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !action) return;

    // 選択されたクラス情報をセッションに保存
    sessionStorage.setItem('selectedClass', selectedClass);
    
    if (action === 'borrow') {
      router.push('/for_students/borrow');
    } else {
      router.push('/for_students/return');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('student');
    sessionStorage.removeItem('selectedClass');
    router.push('/for_students/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">物品管理システム</h1>
        </div>

        {/* メインコンテンツ */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">クラスと操作を選択してください</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* クラス選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                クラス
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">クラスを選択してください</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            {/* 操作選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                操作
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="relative">
                  <input
                    type="radio"
                    name="action"
                    value="borrow"
                    checked={action === 'borrow'}
                    onChange={(e) => setAction(e.target.value as 'borrow')}
                    className="sr-only"
                  />
                  <div className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 text-center ${
                    action === 'borrow'
                      ? 'border-blue-500 bg-blue-900/50 text-blue-300'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}>
                    <div className="text-2xl mb-2">📤</div>
                    <div className="font-semibold">借用</div>
                    <div className="text-sm opacity-75">物を借りる</div>
                  </div>
                </label>

                <label className="relative">
                  <input
                    type="radio"
                    name="action"
                    value="return"
                    checked={action === 'return'}
                    onChange={(e) => setAction(e.target.value as 'return')}
                    className="sr-only"
                  />
                  <div className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 text-center ${
                    action === 'return'
                      ? 'border-green-500 bg-green-900/50 text-green-300'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}>
                    <div className="text-2xl mb-2">📥</div>
                    <div className="font-semibold">返却</div>
                    <div className="text-sm opacity-75">物を返す</div>
                  </div>
                </label>
              </div>
            </div>

            {/* 実行ボタン */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={!selectedClass || !action}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {action === 'borrow' ? '借用ページへ' : action === 'return' ? '返却ページへ' : '選択してください'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
