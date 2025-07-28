'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getFilteredInstances, returnInstance, getItems, getClasses } from '@/lib/firestore';
import { Instance, Item, Class } from '@/lib/types';

type SortField = 'id' | 'itemType' | 'borrowedAt';
type SortDirection = 'asc' | 'desc';

export default function Return() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sortedInstances, setSortedInstances] = useState<Instance[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [className, setClassName] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const router = useRouter();

  useEffect(() => {
    // 学生認証チェック
    const studentData = sessionStorage.getItem('student');
    if (!studentData) {
      router.push('/for_students/login');
      return;
    }

    const selectedClass = sessionStorage.getItem('selectedClass');
    if (!selectedClass) {
      router.push('/for_students/select');
      return;
    }

    fetchBorrowedItems(selectedClass);
  }, []); // routerの依存を削除

  const fetchBorrowedItems = useCallback(async (classId: string) => {
    try {
      setLoading(true);
      
      // 並列でデータを取得
      const [borrowedInstances, itemsData, classesData] = await Promise.all([
        getFilteredInstances({
          borrowedBy: classId,
          isAvailable: false
        }),
        getItems(),
        getClasses()
      ]);
      
      setInstances(borrowedInstances);
      setItems(itemsData);
      setClasses(classesData);
      
      // クラス名を設定
      const classInfo = classesData.find(c => c.id === classId);
      setClassName(classInfo ? classInfo.name : `クラス ${classId}`);
    } catch (error) {
      console.error('借用中物品の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getItemName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    return item ? item.label : itemId;
  };

  // ソート機能
  useEffect(() => {
    let sorted = [...instances];

    // ソート
    sorted.sort((a, b) => {
      if (sortField === 'id') {
        // 識別番号(id)を prefix と数値部に分割して比較
        const parseId = (id: string): [string, number] => {
          const m = id.match(/^(.*?)(\d+)$/);
          return m ? [m[1], parseInt(m[2], 10)] : [id, 0];
        };
        const [prefixA, numA] = parseId(a.id);
        const [prefixB, numB] = parseId(b.id);
        if (prefixA !== prefixB) {
          return sortDirection === 'asc'
            ? prefixA.localeCompare(prefixB)
            : prefixB.localeCompare(prefixA);
        }
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      } else if (sortField === 'itemType') {
        const itemA = getItemName(a.itemId);
        const itemB = getItemName(b.itemId);
        return sortDirection === 'asc'
          ? itemA.localeCompare(itemB)
          : itemB.localeCompare(itemA);
      } else if (sortField === 'borrowedAt') {
        const timeA = a.borrowedAt ? a.borrowedAt.toDate().getTime() : 0;
        const timeB = b.borrowedAt ? b.borrowedAt.toDate().getTime() : 0;
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return 0;
    });

    setSortedInstances(sorted);
  }, [instances, sortField, sortDirection, items]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleInstanceSelect = (instanceId: string) => {
    setSelectedInstances(prev => {
      if (prev.includes(instanceId)) {
        return prev.filter(id => id !== instanceId);
      } else {
        return [...prev, instanceId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedInstances.length === sortedInstances.length) {
      setSelectedInstances([]);
    } else {
      setSelectedInstances(sortedInstances.map(instance => instance.id));
    }
  };

  const handleReturn = async () => {
    if (selectedInstances.length === 0) return;

    if (!confirm(`${selectedInstances.length}個の物品を返却しますか？`)) {
      return;
    }

    setProcessing(true);
    try {
      // 選択された物品を並列で返却処理
      await Promise.all(
        selectedInstances.map(instanceId => returnInstance(instanceId))
      );

      alert('返却処理が完了しました');
      router.push('/for_students/select');
    } catch (error) {
      console.error('返却処理に失敗しました:', error);
      alert('返却処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const goBack = () => {
    router.push('/for_students/select');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">借用中の物品を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">物品返却</h1>
            <p className="text-gray-400 mt-2">{className}</p>
          </div>
          <button
            onClick={goBack}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            戻る
          </button>
        </div>

        {instances.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-gray-400 text-lg">現在借用中の物品はありません</div>
            <button
              onClick={goBack}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              選択画面に戻る
            </button>
          </div>
        ) : (
          <>
            {/* コントロールバー */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSelectAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {selectedInstances.length === sortedInstances.length ? '全て解除' : '全て選択'}
                </button>
                <span className="text-gray-300">
                  {selectedInstances.length} / {sortedInstances.length} 個選択中
                </span>
              </div>
              
              <button
                onClick={handleReturn}
                disabled={selectedInstances.length === 0 || processing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
              >
                {processing ? '返却処理中...' : `${selectedInstances.length}個を返却`}
              </button>
            </div>

            {/* 物品リスト */}
            <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                        onClick={handleSelectAll}
                      >
                        <input
                          type="checkbox"
                          checked={selectedInstances.length === sortedInstances.length && sortedInstances.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 pointer-events-none"
                        />
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors duration-200"
                        onClick={() => handleSort('id')}
                      >
                        識別番号 {getSortIcon('id')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors duration-200"
                        onClick={() => handleSort('itemType')}
                      >
                        物品名 {getSortIcon('itemType')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors duration-200"
                        onClick={() => handleSort('borrowedAt')}
                      >
                        借用日時 {getSortIcon('borrowedAt')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {sortedInstances.map((instance) => (
                      <tr key={instance.id} className="hover:bg-gray-700">
                        <td 
                          className="px-6 py-4 whitespace-nowrap cursor-pointer"
                          onClick={() => handleInstanceSelect(instance.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedInstances.includes(instance.id)}
                            onChange={() => handleInstanceSelect(instance.id)}
                            className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 pointer-events-none"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {instance.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {getItemName(instance.itemId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {instance.borrowedAt ? instance.borrowedAt.toDate().toLocaleString('ja-JP') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
