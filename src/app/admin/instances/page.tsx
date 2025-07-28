'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getFilteredInstances, getItems, getClasses, addInstance, borrowInstance, returnInstance, deleteInstance } from '@/lib/firestore';
import { Instance, Item, Class } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

type SortField = 'id' | 'itemType' | 'status' | 'borrowedBy' | 'borrowedAt';
type SortDirection = 'asc' | 'desc';

// カスタムモーダルの型定義
type ModalType = 'alert' | 'confirm';
interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

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
  const [loading, setLoading] = useState(false); // 初期状態は false
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
  const [filterClass, setFilterClass] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // カスタムモーダル用の状態
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
  });
  
  const router = useRouter();

  // カスタムモーダル用のヘルパー関数
  const showAlert = (title: string, message: string) => {
    setModal({
      isOpen: true,
      type: 'alert',
      title,
      message,
      onConfirm: () => setModal(prev => ({ ...prev, isOpen: false })),
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => setModal(prev => ({ ...prev, isOpen: false })),
    });
  };

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

    fetchInitialData();
  }, []); // routerの依存を削除

  // フィルタ選択時にインスタンスを取得
  useEffect(() => {
    if (filterItemType || filterClass) {
      fetchFilteredInstances();
    } else {
      setInstances([]);
      setFilteredInstances([]);
    }
  }, [filterItemType, filterClass]);

  // ソート機能
  useEffect(() => {
    let filtered = [...instances];

    // ソート
    filtered.sort((a, b) => {
      // 識別番号(id)を prefix と数値部に分割して比較
      if (sortField === 'id') {
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
      }
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        // case 'id' は上部で処理済み
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
  }, [instances, sortField, sortDirection, items, classes, getItemName, getClassName]);

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
    setFilterItemType('');
    setFilterClass('');
    setSortField('id');
    setSortDirection('asc');
  };

  const showAllBorrowedItems = async () => {
    try {
      console.log('貸出中物品すべて取得開始');
      setLoading(true);
      
      // 貸出中の物品のみを取得 (isAvailable: false)
      const borrowedInstances = await getFilteredInstances({
        isAvailable: false
      });
      
      console.log('貸出中物品すべて取得完了:', borrowedInstances.length);
      setInstances(borrowedInstances);
      
      // フィルタをクリア
      setFilterItemType('');
      setFilterClass('');
    } catch (error) {
      console.error('貸出中物品の取得に失敗しました:', error);
      showAlert('エラー', `貸出中物品の取得に失敗しました: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = useCallback(async () => {
    try {
      console.log('初期データ取得開始');
      const [itemsData, classesData] = await Promise.all([
        getItems(),
        getClasses()
      ]);
      console.log('初期データ取得完了:', { items: itemsData.length, classes: classesData.length });
      // アイテムを降順でソート
      setItems(itemsData.sort((a: Item, b: Item) => b.label.localeCompare(a.label)));
      // クラスを降順でソート
      setClasses(classesData.sort((a: Class, b: Class) => b.name.localeCompare(a.name)));
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
      showAlert('エラー', `データの取得に失敗しました: ${error}`);
    }
  }, []);

  const fetchFilteredInstances = useCallback(async () => {
    try {
      console.log('フィルタ済みインスタンス取得開始:', { filterItemType, filterClass });
      setLoading(true);
      const filters: any = {};
      
      if (filterItemType) filters.itemId = filterItemType;
      if (filterClass) filters.borrowedBy = filterClass;
      
      const instancesData = await getFilteredInstances(filters);
      console.log('フィルタ済みインスタンス取得完了:', instancesData.length);
      setInstances(instancesData);
    } catch (error) {
      console.error('インスタンスの取得に失敗しました:', error);
      showAlert('エラー', `インスタンスの取得に失敗しました: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [filterItemType, filterClass]);

  const handleAddInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstanceId.trim() || !selectedItemId) return;

    try {
      console.log('インスタンス追加開始:', { instanceId: newInstanceId.trim(), itemId: selectedItemId });
      await addInstance(newInstanceId.trim(), selectedItemId);
      console.log('インスタンス追加成功');
      setNewInstanceId('');
      setSelectedItemId('');
      setShowAddForm(false);
      await fetchFilteredInstances();
      showAlert('成功', '物品を追加しました');
    } catch (error) {
      console.error('物品の追加に失敗しました:', error);
      showAlert('エラー', `物品の追加に失敗しました: ${error}`);
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
      await fetchFilteredInstances();
      
      if (errors.length === 0) {
        showAlert('成功', `${bulkCount}個の物品を追加しました`);
      } else {
        showAlert('一部成功', `${bulkCount - errors.length}個の物品を追加しました。\n失敗: ${errors.length}個\n\n失敗した物品:\n${errors.join('\n')}`);
      }
    } catch (error) {
      console.error('一括追加に失敗しました:', error);
      showAlert('エラー', '一括追加に失敗しました。一部の物品が重複している可能性があります。');
    }
  };

  const handleBorrow = async () => {
    if (!selectedInstance || !selectedClassId) return;

    try {
      console.log('貸出処理開始:', { instanceId: selectedInstance.id, classId: selectedClassId });
      await borrowInstance(selectedInstance.id, selectedClassId);
      console.log('貸出処理成功');
      setShowBorrowModal(false);
      setSelectedInstance(null);
      setSelectedClassId('');
      await fetchFilteredInstances();
      showAlert('成功', '貸出処理が完了しました');
    } catch (error) {
      console.error('貸出処理に失敗しました:', error);
      showAlert('エラー', `貸出処理に失敗しました: ${error}`);
    }
  };

  const handleReturn = async (instanceId: string) => {
    showConfirm('返却確認', 'この物品を返却しますか？', async () => {
      try {
        console.log('返却処理開始:', { instanceId });
        await returnInstance(instanceId);
        console.log('返却処理成功');
        // 続けて貸出中のみを表示
        await showAllBorrowedItems();
        showAlert('成功', '返却処理が完了しました');
      } catch (error) {
        console.error('返却処理に失敗しました:', error);
        showAlert('エラー', `返却処理に失敗しました: ${error}`);
      }
    });
  };

  const handleDelete = async (instanceId: string) => {
    showConfirm('削除確認', 'この物品を削除しますか？', async () => {
      try {
        await deleteInstance(instanceId);
        await fetchFilteredInstances();
      } catch (error) {
        console.error('物品の削除に失敗しました:', error);
        showAlert('エラー', `物品の削除に失敗しました: ${error}`);
      }
    });
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
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-xl border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/admin/dashboard" className="text-blue-400 hover:text-blue-300 mr-4 transition-colors duration-200">
                ← ダッシュボードに戻る
              </a>
              <h1 className="text-xl font-bold text-white">在庫管理</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8 flex flex-wrap gap-4">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {showAddForm ? 'キャンセル' : '新しい物品を追加'}
            </button>
            <button
              onClick={() => setShowBulkAddForm(!showBulkAddForm)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {showBulkAddForm ? 'キャンセル' : '一括追加'}
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              フィルタをクリア
            </button>
            <button
              onClick={showAllBorrowedItems}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              貸出中すべて表示
            </button>
            <div className="text-sm text-gray-400 flex items-center bg-gray-800 px-4 py-3 rounded-lg border border-gray-700">
              {filteredInstances.length > 0 ? (
                <span>
                  表示中: {filteredInstances.length}件
                  {!filterItemType && !filterClass && filteredInstances.some(instance => !instance.isAvailable) && 
                    <span className="ml-2 text-yellow-400">（貸出中物品を表示中）</span>
                  }
                </span>
              ) : (
                'フィルタを選択してください'
              )}
            </div>
          </div>

          {/* フィルタとソート */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-xl mb-8 border border-gray-700">
            <h3 className="text-lg font-semibold mb-6 text-white">フィルタ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-3">
                  物品名
                </label>
                <select
                  value={filterItemType}
                  onChange={(e) => setFilterItemType(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">すべて</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-3">
                  借用クラス
                </label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
            <div className="bg-gray-800 p-6 rounded-xl shadow-xl mb-8 border border-gray-700">
              <h3 className="text-lg font-semibold mb-6 text-white">新しい物品を追加</h3>
              <form onSubmit={handleAddInstance}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-3">
                      識別番号
                    </label>
                    <input
                      type="text"
                      value={newInstanceId}
                      onChange={(e) => setNewInstanceId(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="例: PROJ-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-3">
                      物品名
                    </label>
                    <select
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    >
                      <option value="">選択してください</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
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

          <div className="bg-gray-800 shadow-xl overflow-hidden rounded-xl border border-gray-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900">
                  <tr>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors duration-200"
                      onClick={() => handleSort('id')}
                    >
                      識別番号 {getSortIcon('id')}
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors duration-200"
                      onClick={() => handleSort('itemType')}
                    >
                      物品種別 {getSortIcon('itemType')}
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors duration-200"
                      onClick={() => handleSort('status')}
                    >
                      状態 {getSortIcon('status')}
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors duration-200"
                      onClick={() => handleSort('borrowedBy')}
                    >
                      借用クラス {getSortIcon('borrowedBy')}
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors duration-200"
                      onClick={() => handleSort('borrowedAt')}
                    >
                      貸出日時 {getSortIcon('borrowedAt')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {filteredInstances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        {filterItemType || filterClass
                          ? '条件に一致する物品がありません' 
                          : 'フィルタを選択して物品を表示してください'}
                      </td>
                    </tr>
                  ) : (
                    filteredInstances.map((instance) => (
                      <tr key={instance.id} className="hover:bg-gray-700 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                          {instance.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {getItemName(instance.itemId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            instance.isAvailable 
                              ? 'bg-green-900/50 text-green-300 border border-green-700' 
                              : 'bg-red-900/50 text-red-300 border border-red-700'
                          }`}>
                            {instance.isAvailable ? '利用可能' : '貸出中'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {instance.borrowedBy ? getClassName(instance.borrowedBy) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(instance.borrowedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                          {instance.isAvailable ? (
                            <button
                              onClick={() => {
                                setSelectedInstance(instance);
                                setShowBorrowModal(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              貸出
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReturn(instance.id)}
                              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              返却
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(instance.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-200 shadow-md hover:shadow-lg"
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
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-bold mb-6 text-white">貸出処理</h3>
            <div className="mb-6 bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-300">
                <strong className="text-white">識別番号:</strong> {selectedInstance.id}<br />
                <strong className="text-white">物品:</strong> {getItemName(selectedInstance.itemId)}
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-3">
                貸出先クラス
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              >
                <option value="">選択してください</option>
                {classes.map(classItem => (
                  <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
                ))}
              </select>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleBorrow}
                disabled={!selectedClassId}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                貸出実行
              </button>
              <button
                onClick={() => {
                  setShowBorrowModal(false);
                  setSelectedInstance(null);
                  setSelectedClassId('');
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* カスタムモーダル */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-bold mb-6 text-white">{modal.title}</h3>
            <p className="mb-8 text-gray-300 whitespace-pre-line">{modal.message}</p>
            <div className="flex justify-end space-x-4">
              {modal.type === 'confirm' && (
                <button
                  onClick={modal.onCancel}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  キャンセル
                </button>
              )}
              <button
                onClick={modal.onConfirm}
                className={`font-semibold py-3 px-6 rounded-lg text-white transition-all duration-200 shadow-lg hover:shadow-xl ${
                  modal.type === 'confirm' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {modal.type === 'confirm' ? '確認' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
