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
  const querySnapshot = await getDocs(collection(db, 'classes'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Class));
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
  const querySnapshot = await getDocs(collection(db, 'items'));
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
  
  return items;
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
};

export const addInstance = async (instanceId: string, itemId: string): Promise<void> => {
  // 重複チェック
  const q = query(collection(db, 'instances'), where('id', '==', instanceId));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    throw new Error(`識別番号 ${instanceId} は既に存在しています`);
  }
  
  // トランザクションで instances 追加と items カウンタ更新を同期実行
  await runTransaction(db, async (transaction) => {
    // インスタンス追加
    const instanceRef = doc(collection(db, 'instances'));
    transaction.set(instanceRef, {
      id: instanceId,
      itemId,
      isAvailable: true,
      borrowedBy: null,
      borrowedAt: null
    });
    
    // アイテムカウンタ更新（カウンタが存在しない場合は初期化）
    const itemRef = doc(db, 'items', itemId);
    const itemDoc = await transaction.get(itemRef);
    const itemData = itemDoc.data();
    
    if (itemData && (itemData.totalCount === undefined || itemData.borrowedCount === undefined || itemData.availableCount === undefined)) {
      // カウンタが存在しない場合、現在のインスタンス数を計算して初期化
      const instances = await getInstances();
      const itemInstances = instances.filter(instance => instance.itemId === itemId);
      const totalCount = itemInstances.length + 1; // 新規追加分を含む
      const borrowedCount = itemInstances.filter(instance => !instance.isAvailable).length;
      const availableCount = totalCount - borrowedCount;
      
      transaction.update(itemRef, {
        totalCount,
        borrowedCount,
        availableCount
      });
    } else {
      // 既存のカウンタを更新
      transaction.update(itemRef, {
        totalCount: increment(1),
        availableCount: increment(1)
      });
    }
  });
};

export const borrowInstance = async (instanceId: string, classId: string): Promise<void> => {
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
  
  // トランザクションでインスタンス更新とアイテムカウンタ更新を同期実行
  await runTransaction(db, async (transaction) => {
    // インスタンス更新
    const instanceRef = instanceDoc.ref;
    transaction.update(instanceRef, {
      isAvailable: false,
      borrowedBy: classId,
      borrowedAt: Timestamp.now()
    });
    
    // アイテムカウンタ更新
    const itemRef = doc(db, 'items', instanceData.itemId);
    const itemDoc = await transaction.get(itemRef);
    const itemData = itemDoc.data();
    
    if (itemData && (itemData.totalCount === undefined || itemData.borrowedCount === undefined || itemData.availableCount === undefined)) {
      // カウンタが存在しない場合、現在のインスタンス数を計算して初期化
      const instances = await getInstances();
      const itemInstances = instances.filter(instance => instance.itemId === instanceData.itemId);
      const totalCount = itemInstances.length;
      const borrowedCount = itemInstances.filter(instance => !instance.isAvailable).length + 1; // 現在の貸出分を含む
      const availableCount = totalCount - borrowedCount;
      
      transaction.update(itemRef, {
        totalCount,
        borrowedCount,
        availableCount
      });
    } else {
      // 既存のカウンタを更新
      transaction.update(itemRef, {
        borrowedCount: increment(1),
        availableCount: increment(-1)
      });
    }
  });
};

export const returnInstance = async (instanceId: string): Promise<void> => {
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
  
  // トランザクションでインスタンス更新とアイテムカウンタ更新を同期実行
  await runTransaction(db, async (transaction) => {
    // インスタンス更新
    const instanceRef = instanceDoc.ref;
    transaction.update(instanceRef, {
      isAvailable: true,
      borrowedBy: null,
      borrowedAt: null
    });
    
    // アイテムカウンタ更新
    const itemRef = doc(db, 'items', instanceData.itemId);
    const itemDoc = await transaction.get(itemRef);
    const itemData = itemDoc.data();
    
    if (itemData && (itemData.totalCount === undefined || itemData.borrowedCount === undefined || itemData.availableCount === undefined)) {
      // カウンタが存在しない場合、現在のインスタンス数を計算して初期化
      const instances = await getInstances();
      const itemInstances = instances.filter(instance => instance.itemId === instanceData.itemId);
      const totalCount = itemInstances.length;
      const borrowedCount = itemInstances.filter(instance => !instance.isAvailable).length - 1; // 現在の返却分を除く
      const availableCount = totalCount - borrowedCount;
      
      transaction.update(itemRef, {
        totalCount,
        borrowedCount,
        availableCount
      });
    } else {
      // 既存のカウンタを更新
      transaction.update(itemRef, {
        borrowedCount: increment(-1),
        availableCount: increment(1)
      });
    }
  });
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
