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
  Timestamp
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
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Item));
};

export const addItem = async (label: string): Promise<string> => {
  const docRef = await addDoc(collection(db, 'items'), { label });
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

export const addInstance = async (instanceId: string, itemId: string): Promise<void> => {
  // 重複チェック
  const q = query(collection(db, 'instances'), where('id', '==', instanceId));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    throw new Error(`識別番号 ${instanceId} は既に存在しています`);
  }
  
  await addDoc(collection(db, 'instances'), {
    id: instanceId,
    itemId,
    isAvailable: true,
    borrowedBy: null,
    borrowedAt: null
  });
};

export const borrowInstance = async (instanceId: string, classId: string): Promise<void> => {
  // カスタムIDからFirestoreドキュメントIDを検索
  const q = query(collection(db, 'instances'), where('id', '==', instanceId));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error(`アイテム ${instanceId} が見つかりません`);
  }
  
  const docRef = querySnapshot.docs[0].ref;
  await updateDoc(docRef, {
    isAvailable: false,
    borrowedBy: classId,
    borrowedAt: Timestamp.now()
  });
};

export const returnInstance = async (instanceId: string): Promise<void> => {
  // カスタムIDからFirestoreドキュメントIDを検索
  const q = query(collection(db, 'instances'), where('id', '==', instanceId));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error(`アイテム ${instanceId} が見つかりません`);
  }
  
  const docRef = querySnapshot.docs[0].ref;
  await updateDoc(docRef, {
    isAvailable: true,
    borrowedBy: null,
    borrowedAt: null
  });
};

export const deleteInstance = async (instanceId: string): Promise<void> => {
  // カスタムIDからFirestoreドキュメントIDを検索
  const q = query(collection(db, 'instances'), where('id', '==', instanceId));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error(`アイテム ${instanceId} が見つかりません`);
  }
  
  const docRef = querySnapshot.docs[0].ref;
  await deleteDoc(docRef);
};

// 在庫数を取得（生徒向け）
export const getItemAvailability = async () => {
  const items = await getItems();
  const instances = await getInstances();
  
  return items.map(item => {
    const availableCount = instances.filter(
      instance => instance.itemId === item.id && instance.isAvailable
    ).length;
    
    return {
      itemName: item.label,
      availableCount
    };
  });
};
