'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getInstances, getItems, getClasses, addInstance, borrowInstance, returnInstance, deleteInstance } from '@/lib/firestore';
import { Instance, Item, Class } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

type SortField = 'id' | 'itemType' | 'status' | 'borrowedBy' | 'borrowedAt';
type SortDirection = 'asc' | 'desc';

export default function InstancesManagement() {
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
  const [instances, setInstances] = useState<Instance[]>([]);
  const [filteredInstances, setFilteredInstances] = useState<Instance[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInstanceId, setNewInstanceId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  
  // 一括追加用の状態
  const [showBulkAddForm, setShowBulkAddForm] = useState(false);
  const [bulkInstanceId, setBulkInstanceId] = useState('');
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkSelectedItemId, setBulkSelectedItemId] = useState('');
  
  // フィルタとソート機能用の状態
  const [filterItemType, setFilterItemType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  
  const router = useRouter();

  const getItemName = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    return item ? item.label : '不明';
  }, [items]);

  const getClassName = useCallback((classId: string) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.name : '不明';
  }, [classes]);

  useEffect(() => {
    const adminData = sessionStorage.getItem('admin');
    if (!adminData) {
      router.push('/admin/login');
      return;
    }

    fetchData();
  }, [router]);

  // フィルタとソート機能
  useEffect(() => {
    let filtered = [...instances];

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(instance => 
        instance.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getItemName(instance.itemId).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // アイテム種別フィルタ
    if (filterItemType) {
      filtered = filtered.filter(instance => instance.itemId === filterItemType);
    }

    // ステータスフィルタ
    if (filterStatus === 'available') {
      filtered = filtered.filter(instance => instance.isAvailable);
    } else if (filterStatus === 'borrowed') {
      filtered = filtered.filter(instance => !instance.isAvailable);
    }

    // クラスフィルタ
    if (filterClass) {
      filtered = filtered.filter(instance => instance.borrowedBy === filterClass);
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'itemType':
          aValue = getItemName(a.itemId);
          bValue = getItemName(b.itemId);
          break;
        case 'status':
          aValue = a.isAvailable ? 'available' : 'borrowed';
          bValue = b.isAvailable ? 'available' : 'borrowed';
          break;
        case 'borrowedBy':
          aValue = a.borrowedBy ? getClassName(a.borrowedBy) : '';
          bValue = b.borrowedBy ? getClassName(b.borrowedBy) : '';
          break;
        case 'borrowedAt':
          aValue = a.borrowedAt ? a.borrowedAt.toDate() : new Date(0);
          bValue = b.borrowedAt ? b.borrowedAt.toDate() : new Date(0);
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' 
          ? (aValue < bValue ? -1 : aValue > bValue ? 1 : 0)
          : (aValue > bValue ? -1 : aValue < bValue ? 1 : 0);
      }
    });

    setFilteredInstances(filtered);
  }, [instances, searchTerm, filterItemType, filterStatus, filterClass, sortField, sortDirection, items, classes, getItemName, getClassName]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterItemType('');
    setFilterStatus('');
    setFilterClass('');
    setSortField('id');
    setSortDirection('asc');
  };

  const fetchData = async () => {
    try {
      const [instancesData, itemsData, classesData] = await Promise.all([
        getInstances(),
        getItems(),
        getClasses()
      ]);
      setInstances(instancesData);
      // アイテムを降順でソート
      setItems(itemsData.sort((a, b) => b.label.localeCompare(a.label)));
      // クラスを降順でソート
      setClasses(classesData.sort((a, b) => b.name.localeCompare(a.name)));
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstanceId.trim() || !selectedItemId) return;

    try {
      await addInstance(newInstanceId.trim(), selectedItemId);
      setNewInstanceId('');
      setSelectedItemId('');
      setShowAddForm(false);
      await fetchData();
    } catch (error) {
      console.error('物品の追加に失敗しました:', error);
    }
  };

  const handleBulkAddInstances = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInstanceId.trim() || !bulkSelectedItemId || bulkCount < 1) return;

    try {
      const promises = [];
      const errors: string[] = [];
      
      for (let i = 1; i <= bulkCount; i++) {
        const instanceId = `${bulkInstanceId.trim()}-${i}`;
        try {
          promises.push(addInstance(instanceId, bulkSelectedItemId));
        } catch (error) {
          errors.push(`${instanceId}: ${error}`);
        }
      }
      
      await Promise.allSettled(promises);
      setBulkInstanceId('');
      setBulkCount(1);
      setBulkSelectedItemId('');
      setShowBulkAddForm(false);
      await fetchData();
      
      if (errors.length === 0) {
        alert(`${bulkCount}個の物品を追加しました`);
      } else {
        alert(`${bulkCount - errors.length}個の物品を追加しました。\n失敗: ${errors.length}個\n\n失敗した物品:\n${errors.join('\n')}`);
      }
    } catch (error) {
      console.error('一括追加に失敗しました:', error);
      alert('一括追加に失敗しました。一部の物品が重複している可能性があります。');
    }
  };

  const handleBorrow = async () => {
    if (!selectedInstance || !selectedClassId) return;

    try {
      await borrowInstance(selectedInstance.id, selectedClassId);
      setShowBorrowModal(false);
      setSelectedInstance(null);
      setSelectedClassId('');
      await fetchData();
    } catch (error) {
      console.error('貸出処理に失敗しました:', error);
    }
  };

  const handleReturn = async (instanceId: string) => {
    if (!confirm('この物品を返却しますか？')) return;

    try {
      await returnInstance(instanceId);
      await fetchData();
    } catch (error) {
      console.error('返却処理に失敗しました:', error);
    }
  };

  const handleDelete = async (instanceId: string) => {
    if (!confirm('この物品を削除しますか？')) return;

    try {
      await deleteInstance(instanceId);
      await fetchData();
    } catch (error) {
      console.error('物品の削除に失敗しました:', error);
    }
  };

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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
              <h1 className="text-xl font-semibold">在庫管理</h1>
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
              {showAddForm ? 'キャンセル' : '新しい物品を追加'}
            </button>
            <button
              onClick={() => setShowBulkAddForm(!showBulkAddForm)}
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              {showBulkAddForm ? 'キャンセル' : '一括追加'}
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              フィルタをクリア
            </button>
            <div className="text-sm text-gray-600 flex items-center">
              表示中: {filteredInstances.length}件 / 全{instances.length}件
            </div>
          </div>

          {/* フィルタとソート */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-medium mb-4">検索・フィルタ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  識別番号・物品名で検索
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="物品名や識別番号を入力"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  物品名
                </label>
                <select
                  value={filterItemType}
                  onChange={(e) => setFilterItemType(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">すべて</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  ステータス
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">すべて</option>
                  <option value="available">利用可能</option>
                  <option value="borrowed">貸出中</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  借用クラス
                </label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">すべて</option>
                  {classes.map(classItem => (
                    <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {showAddForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-medium mb-4">新しい物品を追加</h3>
              <form onSubmit={handleAddInstance}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      識別番号
                    </label>
                    <input
                      type="text"
                      value={newInstanceId}
                      onChange={(e) => setNewInstanceId(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="例: PROJ-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      物品名
                    </label>
                    <select
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      required
                    >
                      <option value="">選択してください</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </select>
                  </div>
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

          {showBulkAddForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-medium mb-4">一括追加</h3>
              <form onSubmit={handleBulkAddInstances}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      識別番号のベース
                    </label>
                    <input
                      type="text"
                      value={bulkInstanceId}
                      onChange={(e) => setBulkInstanceId(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="例: A"
                      required
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      例: &quot;A&quot; と入力すると A-1, A-2, A-3... が作成されます
                    </p>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      作成個数
                    </label>
                    <input
                      type="number"
                      value={bulkCount === 0 ? '' : bulkCount}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') {
                          setBulkCount(0);
                        } else {
                          const num = parseInt(v) || 1;
                          setBulkCount(Math.min(Math.max(1, num), 50));
                        }
                      }}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      min="1"
                      max="50"
                      required
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      最大50個まで
                    </p>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      物品種別
                    </label>
                    <select
                      value={bulkSelectedItemId}
                      onChange={(e) => setBulkSelectedItemId(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      required
                    >
                      <option value="">選択してください</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {bulkInstanceId && bulkCount > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium text-gray-700 mb-2">作成される識別番号:</p>
                    <p className="text-sm text-gray-600">
                      {Array.from({ length: Math.min(bulkCount, 10) }, (_, i) => `${bulkInstanceId}-${i + 1}`).join(', ')}
                      {bulkCount > 10 && ` ... (他${bulkCount - 10}個)`}
                    </p>
                  </div>
                )}
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                  >
                    一括追加実行
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkAddForm(false)}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('id')}
                    >
                      識別番号 {getSortIcon('id')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('itemType')}
                    >
                      物品種別 {getSortIcon('itemType')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      状態 {getSortIcon('status')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('borrowedBy')}
                    >
                      借用クラス {getSortIcon('borrowedBy')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('borrowedAt')}
                    >
                      貸出日時 {getSortIcon('borrowedAt')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInstances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        {instances.length === 0 ? '物品が登録されていません' : '条件に一致する物品がありません'}
                      </td>
                    </tr>
                  ) : (
                    filteredInstances.map((instance) => (
                      <tr key={instance.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {instance.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getItemName(instance.itemId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            instance.isAvailable 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {instance.isAvailable ? '利用可能' : '貸出中'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {instance.borrowedBy ? getClassName(instance.borrowedBy) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(instance.borrowedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {instance.isAvailable ? (
                            <button
                              onClick={() => {
                                setSelectedInstance(instance);
                                setShowBorrowModal(true);
                              }}
                              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
                            >
                              貸出
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReturn(instance.id)}
                              className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                            >
                              返却
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(instance.id)}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 貸出モーダル */}
      {showBorrowModal && selectedInstance && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">貸出処理</h3>
            <p className="mb-4">
              <strong>識別番号:</strong> {selectedInstance.id}<br />
              <strong>物品:</strong> {getItemName(selectedInstance.itemId)}
            </p>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                貸出先クラス
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">選択してください</option>
                {classes.map(classItem => (
                  <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleBorrow}
                disabled={!selectedClassId}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                貸出実行
              </button>
              <button
                onClick={() => {
                  setShowBorrowModal(false);
                  setSelectedInstance(null);
                  setSelectedClassId('');
                }}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
