// カウンタ初期化用のスクリプト（開発・移行時のみ使用）
import { initializeItemCounters } from '@/lib/firestore';

export const initializeCounters = async () => {
  try {
    await initializeItemCounters();
    console.log('カウンタの初期化が完了しました');
  } catch (error) {
    console.error('カウンタの初期化に失敗しました:', error);
  }
};
