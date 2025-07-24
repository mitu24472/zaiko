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
