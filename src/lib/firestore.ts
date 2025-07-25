// lib/firestore.ts
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { Admin, Class, Item, Instance } from './types';

// Classes
export const getClasses = async (): Promise<Class[]> => {
  try {
    console.log('getClasses開始');
    const querySnapshot = await getDocs(collection(db, 'classes'));
    console.log('getClasses完了:', querySnapshot.docs.length);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Class));
  } catch (error) {
    console.error('getClasses エラー:', error);
    throw error;
  }
};

export const addClass = async (name: string): Promise<string> => {
  const docRef = await addDoc(collection(db, 'classes'), { name });
  return docRef.id;
};

export const updateClass = async (id: string, name: string): Promise<void> => {
  await updateDoc(doc(db, 'classes', id), { name });
};

export const deleteClass = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'classes', id));
};

// Items
export const getItems = async (): Promise<Item[]> => {
  try {
    console.log('getItems開始');
    const querySnapshot = await getDocs(collection(db, 'items'));
    console.log('getItems取得:', querySnapshot.docs.length);
    const items = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Item));
    
    // カウンタフィールドが存在しないアイテムを自動的に更新
    const itemsToUpdate: Item[] = [];
    
    for (const item of items) {
      if (item.totalCount === undefined || item.borrowedCount === undefined || item.availableCount === undefined) {
        itemsToUpdate.push(item);
      }
    }
    
    // カウンタが不足しているアイテムがある場合、インスタンスを取得して計算
    if (itemsToUpdate.length > 0) {
      console.log('カウンタ更新が必要なアイテム:', itemsToUpdate.length);
      const instances = await getInstances();
      
      // 各アイテムのカウンタを計算・更新
      for (const item of itemsToUpdate) {
        const itemInstances = instances.filter(instance => instance.itemId === item.id);
        const totalCount = itemInstances.length;
        const borrowedCount = itemInstances.filter(instance => !instance.isAvailable).length;
        const availableCount = totalCount - borrowedCount;
        
        // Firestoreのアイテムドキュメントを更新
        await updateDoc(doc(db, 'items', item.id), {
          totalCount,
          borrowedCount,
          availableCount
        });
        
        // メモリ上のアイテムオブジェクトも更新
        item.totalCount = totalCount;
        item.borrowedCount = borrowedCount;
        item.availableCount = availableCount;
      }
    }
    
    console.log('getItems完了');
    return items;
  } catch (error) {
    console.error('getItems エラー:', error);
    throw error;
  }
};

export const addItem = async (label: string): Promise<string> => {
  const docRef = await addDoc(collection(db, 'items'), { 
    label,
    totalCount: 0,
    borrowedCount: 0,
    availableCount: 0
  });
  return docRef.id;
};

export const updateItem = async (id: string, label: string): Promise<void> => {
  await updateDoc(doc(db, 'items', id), { label });
};

export const deleteItem = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'items', id));
};

// Instances
export const getInstances = async (): Promise<Instance[]> => {
  const querySnapshot = await getDocs(collection(db, 'instances'));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      firestoreId: doc.id, // FirestoreのドキュメントID
      id: data.id,         // カスタム識別番号
      itemId: data.itemId,
      isAvailable: data.isAvailable,
      borrowedBy: data.borrowedBy,
      borrowedAt: data.borrowedAt
    } as Instance;
  });
};

// フィルタ条件に基づいてインスタンスを取得
export const getFilteredInstances = async (filters: {
  itemId?: string;
  isAvailable?: boolean;
  borrowedBy?: string;
}): Promise<Instance[]> => {
  try {
    console.log('getFilteredInstances開始:', filters);
    const constraints = [];
    
    if (filters.itemId) {
      constraints.push(where('itemId', '==', filters.itemId));
    }
    
    if (filters.isAvailable !== undefined) {
      constraints.push(where('isAvailable', '==', filters.isAvailable));
    }
    
    if (filters.borrowedBy) {
      constraints.push(where('borrowedBy', '==', filters.borrowedBy));
    }
    
    let querySnapshot;
    if (constraints.length > 0) {
      const q = query(collection(db, 'instances'), ...constraints);
      querySnapshot = await getDocs(q);
    } else {
      querySnapshot = await getDocs(collection(db, 'instances'));
    }
    
    console.log('getFilteredInstances取得:', querySnapshot.docs.length);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        firestoreId: doc.id,
        id: data.id,
        itemId: data.itemId,
        isAvailable: data.isAvailable,
        borrowedBy: data.borrowedBy,
        borrowedAt: data.borrowedAt
      } as Instance;
    });
  } catch (error) {
    console.error('getFilteredInstances エラー:', error);
    throw error;
  }
};

export const addInstance = async (instanceId: string, itemId: string): Promise<void> => {
  try {
    console.log('addInstance開始:', { instanceId, itemId });
    
    // 重複チェック
    const q = query(collection(db, 'instances'), where('id', '==', instanceId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error(`識別番号 ${instanceId} は既に存在しています`);
    }
    
    console.log('重複チェック完了、トランザクション開始');
    
    // トランザクションで instances 追加と items カウンタ更新を同期実行
    await runTransaction(db, async (transaction) => {
      console.log('トランザクション内部開始');
      
      // 最初にすべての読み取り操作を実行
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await transaction.get(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error(`アイテム ${itemId} が存在しません`);
      }
      
      const itemData = itemDoc.data();
      
      // 次に書き込み操作を実行
      // インスタンス追加
      const instanceRef = doc(collection(db, 'instances'));
      transaction.set(instanceRef, {
        id: instanceId,
        itemId,
        isAvailable: true,
        borrowedBy: null,
        borrowedAt: null
      });
      
      console.log('インスタンス追加完了、アイテムカウンタ更新開始');
      
      // アイテムカウンタ更新
      if (itemData && (itemData.totalCount === undefined || itemData.borrowedCount === undefined || itemData.availableCount === undefined)) {
        console.log('カウンタ初期化（1, 0, 1に設定）');
        transaction.update(itemRef, {
          totalCount: 1,
          borrowedCount: 0,
          availableCount: 1
        });
      } else {
        console.log('カウンタ更新');
        // 既存のカウンタを更新
        transaction.update(itemRef, {
          totalCount: increment(1),
          availableCount: increment(1)
        });
      }
      
      console.log('トランザクション内部完了');
    });
    
    console.log('addInstance完了');
  } catch (error) {
    console.error('addInstance エラー:', error);
    throw error;
  }
};

export const borrowInstance = async (instanceId: string, classId: string): Promise<void> => {
  try {
    console.log('borrowInstance開始:', { instanceId, classId });
    
    // カスタムIDからFirestoreドキュメントIDを検索
    const q = query(collection(db, 'instances'), where('id', '==', instanceId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error(`アイテム ${instanceId} が見つかりません`);
    }
    
    const instanceDoc = querySnapshot.docs[0];
    const instanceData = instanceDoc.data();
    
    if (!instanceData.isAvailable) {
      throw new Error(`アイテム ${instanceId} は既に貸出中です`);
    }
    
    console.log('インスタンス確認完了、トランザクション開始');
    
    // トランザクションでインスタンス更新とアイテムカウンタ更新を同期実行
    await runTransaction(db, async (transaction) => {
      // 最初にすべての読み取り操作を実行
      const itemRef = doc(db, 'items', instanceData.itemId);
      const itemDoc = await transaction.get(itemRef);
      const itemData = itemDoc.data();
      
      // 次に書き込み操作を実行
      // インスタンス更新
      const instanceRef = instanceDoc.ref;
      transaction.update(instanceRef, {
        isAvailable: false,
        borrowedBy: classId,
        borrowedAt: Timestamp.now()
      });
      
      // アイテムカウンタ更新
      if (itemData && (itemData.totalCount === undefined || itemData.borrowedCount === undefined || itemData.availableCount === undefined)) {
        console.log('カウンタ初期化（貸出）');
        // 最初の貸出の場合、1,1,0に設定
        transaction.update(itemRef, {
          totalCount: 1,
          borrowedCount: 1,
          availableCount: 0
        });
      } else {
        console.log('カウンタ更新（貸出）');
        // 既存のカウンタを更新
        transaction.update(itemRef, {
          borrowedCount: increment(1),
          availableCount: increment(-1)
        });
      }
    });
    
    console.log('borrowInstance完了');
  } catch (error) {
    console.error('borrowInstance エラー:', error);
    throw error;
  }
};

export const returnInstance = async (instanceId: string): Promise<void> => {
  try {
    console.log('returnInstance開始:', { instanceId });
    
    // カスタムIDからFirestoreドキュメントIDを検索
    const q = query(collection(db, 'instances'), where('id', '==', instanceId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error(`アイテム ${instanceId} が見つかりません`);
    }
    
    const instanceDoc = querySnapshot.docs[0];
    const instanceData = instanceDoc.data();
    
    if (instanceData.isAvailable) {
      throw new Error(`アイテム ${instanceId} は既に返却済みです`);
    }
    
    console.log('インスタンス確認完了、トランザクション開始');
    
    // トランザクションでインスタンス更新とアイテムカウンタ更新を同期実行
    await runTransaction(db, async (transaction) => {
      // 最初にすべての読み取り操作を実行
      const itemRef = doc(db, 'items', instanceData.itemId);
      const itemDoc = await transaction.get(itemRef);
      const itemData = itemDoc.data();
      
      // 次に書き込み操作を実行
      // インスタンス更新
      const instanceRef = instanceDoc.ref;
      transaction.update(instanceRef, {
        isAvailable: true,
        borrowedBy: null,
        borrowedAt: null
      });
      
      // アイテムカウンタ更新
      if (itemData && (itemData.totalCount === undefined || itemData.borrowedCount === undefined || itemData.availableCount === undefined)) {
        console.log('カウンタ初期化（返却）');
        // 返却の場合、1,0,1に設定
        transaction.update(itemRef, {
          totalCount: 1,
          borrowedCount: 0,
          availableCount: 1
        });
      } else {
        console.log('カウンタ更新（返却）');
        // 既存のカウンタを更新
        transaction.update(itemRef, {
          borrowedCount: increment(-1),
          availableCount: increment(1)
        });
      }
    });
    
    console.log('returnInstance完了');
  } catch (error) {
    console.error('returnInstance エラー:', error);
    throw error;
  }
};

export const deleteInstance = async (instanceId: string): Promise<void> => {
  // カスタムIDからFirestoreドキュメントIDを検索
  const q = query(collection(db, 'instances'), where('id', '==', instanceId));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error(`アイテム ${instanceId} が見つかりません`);
  }
  
  const instanceDoc = querySnapshot.docs[0];
  const instanceData = instanceDoc.data();
  
  // トランザクションでインスタンス削除とアイテムカウンタ更新を同期実行
  await runTransaction(db, async (transaction) => {
    // インスタンス削除
    const instanceRef = instanceDoc.ref;
    transaction.delete(instanceRef);
    
    // アイテムカウンタ更新
    const itemRef = doc(db, 'items', instanceData.itemId);
    if (instanceData.isAvailable) {
      // 利用可能な状態で削除される場合
      transaction.update(itemRef, {
        totalCount: increment(-1),
        availableCount: increment(-1)
      });
    } else {
      // 貸出中の状態で削除される場合
      transaction.update(itemRef, {
        totalCount: increment(-1),
        borrowedCount: increment(-1)
      });
    }
  });
};

// 在庫数を取得（生徒向け）- 効率化バージョン
export const getItemAvailability = async () => {
  const items = await getItems(); // getItemsが自動的にカウンタを初期化
  
  return items.map(item => ({
    itemName: item.label,
    availableCount: item.availableCount ?? 0,
    totalCount: item.totalCount ?? 0,
    borrowedCount: item.borrowedCount ?? 0
  }));
};

// 既存のアイテムのカウンタを初期化する関数（初回移行用）
export const initializeItemCounters = async (): Promise<void> => {
  const items = await getItems();
  const instances = await getInstances();
  
  for (const item of items) {
    const itemInstances = instances.filter(instance => instance.itemId === item.id);
    const totalCount = itemInstances.length;
    const borrowedCount = itemInstances.filter(instance => !instance.isAvailable).length;
    const availableCount = totalCount - borrowedCount;
    
    await updateDoc(doc(db, 'items', item.id), {
      totalCount,
      borrowedCount,
      availableCount
    });
  }
};
