'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function ForStudentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // ログインページ以外では認証チェック
    if (pathname !== '/for_students/login') {
      const studentData = sessionStorage.getItem('student');
      if (!studentData) {
        router.push('/for_students/login');
        return;
      }
    }
  }, [pathname, router]);

  return <>{children}</>;
}
