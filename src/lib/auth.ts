// lib/auth.ts
import CryptoJS from 'crypto-js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Admin } from './types';

const SALT = 'koishikawa_sosakuten_2025'; // 固定salt

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password + SALT).toString();
}

export async function authenticateAdmin(name: string, password: string): Promise<Admin | null> {
  try {
    const passwordHash = hashPassword(password);
    console.log("Hashing password: %s", passwordHash);
    // 管理者一覧を取得してマッチするものを探す
    // 実際の実装では、Firestoreクエリを使用する
    // ここでは簡単のため、ドキュメントIDがnameと仮定
    const adminDoc = await getDoc(doc(db, 'admins', name));
    
    if (adminDoc.exists()) {
      const adminData = adminDoc.data() as Omit<Admin, 'id'>;
      if (adminData.passwordHash === passwordHash) {
        return {
          id: adminDoc.id,
          ...adminData
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('認証エラー:', error);
    return null;
  }
}
