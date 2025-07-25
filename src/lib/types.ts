// lib/types.ts
import { Timestamp } from 'firebase/firestore';

export interface Admin {
  id: string;
  name: string;
  passwordHash: string;
}

export interface Class {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  label: string;
  totalCount?: number;    // 総在庫数（オプショナル、後方互換性のため）
  borrowedCount?: number; // 貸出中数（オプショナル、後方互換性のため）
  availableCount?: number; // 利用可能数（オプショナル、後方互換性のため）
}

export interface Instance {
  firestoreId?: string; // FirestoreのドキュメントID（オプショナル）
  id: string; // 識別番号（カスタムID）
  itemId: string; // itemsコレクションへの参照
  isAvailable: boolean;
  borrowedBy: string | null; // classesコレクションへの参照
  borrowedAt: Timestamp | null;
}
