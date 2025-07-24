'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ItemsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // トップページにリダイレクト
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-xl mb-4">リダイレクト中...</div>
        <p className="text-gray-600">
          在庫確認機能はトップページに統合されました。
        </p>
      </div>
    </div>
  );
}
