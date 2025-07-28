import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 静的ファイルとAPIルートはそのまま通す
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ルートパスの場合はそのまま通す
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next();
  }

  // 管理者ルートの場合はそのまま通す
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // 学生用ページのアクセス制御
  if (request.nextUrl.pathname.startsWith('/for_students')) {
    // ログインページは常にアクセス可能
    if (request.nextUrl.pathname === '/for_students/login') {
      return NextResponse.next();
    }
    
    // その他の学生用ページは認証が必要
    // Note: セッション確認はクライアントサイドで行う
    return NextResponse.next();
  }

  // その他のパスもそのまま通す
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
