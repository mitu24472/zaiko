'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getItems, getFilteredInstances, borrowInstance, getClasses } from '@/lib/firestore';
import { Item, Instance, Class } from '@/lib/types';

type SortField = 'id' | 'itemType';
type SortDirection = 'asc' | 'desc';

interface CartItem {
  instanceId: string;
  itemId: string;
  itemName: string;
}

export default function Borrow() {
  const [items, setItems] = useState<Item[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sortedInstances, setSortedInstances] = useState<Instance[]>([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
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

    const classId = sessionStorage.getItem('selectedClass');
    if (!classId) {
      router.push('/for_students/select');
      return;
    }

    setSelectedClass(classId);
    fetchInitialData();
  }, []); // routerの依存を削除し、ESLintの警告を無視

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsData, classesData] = await Promise.all([
        getItems(),
        getClasses()
      ]);
      
      setItems(itemsData.sort((a, b) => a.label.localeCompare(b.label)));
      setClasses(classesData);
      
      // クラス名を設定
      const classId = sessionStorage.getItem('selectedClass');
      if (classId) {
        const classInfo = classesData.find(c => c.id === classId);
        setClassName(classInfo ? classInfo.name : `クラス ${classId}`);
      }
    } catch (error) {
      console.error('初期データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInstances = useCallback(async (itemId: string) => {
    try {
      setLoadingInstances(true);
      // 利用可能な物品のみを取得
      const availableInstances = await getFilteredInstances({
        itemId,
        isAvailable: true
      });
      setInstances(availableInstances);
      setSelectedInstances([]);
    } catch (error) {
      console.error('インスタンス情報の取得に失敗しました:', error);
    } finally {
      setLoadingInstances(false);
    }
  }, []);

  // ソート機能
  useEffect(() => {
    let sorted = [...instances];

    // ソート
    sorted.sort((a, b) => {
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
      } else if (sortField === 'itemType') {
        const itemA = items.find(item => item.id === a.itemId)?.label || a.itemId;
        const itemB = items.find(item => item.id === b.itemId)?.label || b.itemId;
        return sortDirection === 'asc'
          ? itemA.localeCompare(itemB)
          : itemB.localeCompare(itemA);
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
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleItemChange = async (newItemId: string) => {
    // 現在選択されている物品があり、かつ新しい物品が選ばれた場合
    if (selectedInstances.length > 0 && newItemId !== selectedItem) {
      if (confirm('現在選択されている物品をカートに入れますか？')) {
        addSelectedToCart();
      }
      setSelectedInstances([]);
    }

    setSelectedItem(newItemId);
    if (newItemId) {
      await fetchInstances(newItemId);
    } else {
      setInstances([]);
      setSelectedInstances([]);
    }
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
    const availableInstances = sortedInstances.filter(instance => 
      !cart.some(cartItem => cartItem.instanceId === instance.id)
    );
    
    if (selectedInstances.length === availableInstances.length) {
      setSelectedInstances([]);
    } else {
      setSelectedInstances(availableInstances.map(instance => instance.id));
    }
  };

  const addSelectedToCart = () => {
    if (selectedInstances.length === 0) return;

    const itemName = items.find(item => item.id === selectedItem)?.label || '不明';
    const newCartItems: CartItem[] = selectedInstances.map(instanceId => ({
      instanceId,
      itemId: selectedItem,
      itemName
    }));

    setCart(prev => [...prev, ...newCartItems]);
    setSelectedInstances([]);
  };

  const removeFromCart = (instanceId: string) => {
    setCart(prev => prev.filter(item => item.instanceId !== instanceId));
  };

  const clearCart = () => {
    if (confirm('カートを空にしますか？')) {
      setCart([]);
    }
  };

  const handleBorrow = async () => {
    if (cart.length === 0) return;

    setProcessing(true);
    try {
      // カート内の物品を並列で借用処理
      await Promise.all(
        cart.map(cartItem => borrowInstance(cartItem.instanceId, selectedClass))
      );

      alert('借用処理が完了しました');
      setCart([]);
      router.push('/for_students/select');
    } catch (error) {
      console.error('借用処理に失敗しました:', error);
      alert('借用処理に失敗しました');
    } finally {
      setProcessing(false);
      setShowConfirm(false);
    }
  };

  const goBack = () => {
    router.push('/for_students/select');
  };

  const isInCart = (instanceId: string) => {
    return cart.some(item => item.instanceId === instanceId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">物品情報を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">物品借用</h1>
            <p className="text-gray-400 mt-2">{className}</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setShowCart(true)}
              className="relative bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              カート ({cart.length})
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
            <button
              onClick={goBack}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              戻る
            </button>
          </div>
        </div>

        {/* フィルター */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">物品を選択</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                物品種別
              </label>
              <select
                value={selectedItem}
                onChange={(e) => handleItemChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">物品を選択してください</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={addSelectedToCart}
                disabled={selectedInstances.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                選択中の物品をカートに追加 ({selectedInstances.length})
              </button>
            </div>
          </div>
        </div>

        {/* 物品リスト */}
        {selectedItem && (
          <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            {loadingInstances ? (
              <div className="p-8 text-center text-gray-400">
                物品を読み込み中...
              </div>
            ) : sortedInstances.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                利用可能な物品がありません
              </div>
            ) : (
              <>
                {/* コントロールバー */}
                <div className="bg-gray-900 p-4 flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleSelectAll}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      {selectedInstances.length === sortedInstances.filter(i => !isInCart(i.id)).length ? '全て解除' : '全て選択'}
                    </button>
                    <span className="text-gray-300">
                      {selectedInstances.length} 個選択中
                    </span>
                  </div>
                </div>

                {/* テーブル */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          選択
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors duration-200"
                          onClick={() => handleSort('id')}
                        >
                          識別番号 {getSortIcon('id')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          状態
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {sortedInstances.map((instance) => {
                        const inCart = isInCart(instance.id);
                        return (
                          <tr key={instance.id} className={`hover:bg-gray-700 ${inCart ? 'bg-gray-600 opacity-50' : ''}`}>
                            <td 
                              className="px-6 py-4 whitespace-nowrap cursor-pointer"
                              onClick={() => !inCart && handleInstanceSelect(instance.id)}
                            >
                              {inCart ? (
                                <span className="text-blue-400 text-sm">カート内</span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={selectedInstances.includes(instance.id)}
                                  onChange={() => handleInstanceSelect(instance.id)}
                                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 pointer-events-none"
                                />
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                              {instance.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {inCart ? 'カート内' : '利用可能'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* カートモーダル */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">カート ({cart.length}個)</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  カートは空です
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {cart.map((item, index) => (
                    <div key={index} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="text-white font-medium">{item.instanceId}</div>
                        <div className="text-gray-400 text-sm">{item.itemName}</div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.instanceId)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-700 flex flex-col sm:flex-row justify-between gap-4">
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                カートを空にする
              </button>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowCart(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  閉じる
                </button>
                <button
                  onClick={() => {
                    setShowCart(false);
                    setShowConfirm(true);
                  }}
                  disabled={cart.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  借用手続きへ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 確認モーダル */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">借用確認</h3>
            </div>
            
            <div className="p-6">
              <p className="text-gray-300 mb-4">
                以下の物品を借用しますか？
              </p>
              <div className="bg-gray-900 rounded-lg p-4 max-h-60 overflow-y-auto">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                    <div>
                      <div className="text-white font-medium">{item.instanceId}</div>
                      <div className="text-gray-400 text-sm">{item.itemName}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-gray-300">
                合計: {cart.length}個
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex flex-col sm:flex-row justify-end gap-4">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={processing}
                className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleBorrow}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                {processing ? '処理中...' : '借用する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
