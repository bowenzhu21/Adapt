import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_PATH_PREFIXES = ['/login', '/signup', '/logout'];
const ACCESS_TOKEN_COOKIE = 'sb-access-token';
const FALLBACK_STORAGE_COOKIE = 'supabase-auth-token';
const LEGACY_STORAGE_COOKIE = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return null;
    const hostname = new URL(url).hostname.split('.')[0];
    return `sb-${hostname}-auth-token`;
  } catch {
    return null;
  }
})();

function decodeCookieValue(rawValue: string | undefined) {
  if (!rawValue) return null;

  try {
    return JSON.parse(decodeURIComponent(rawValue));
  } catch {
    try {
      return JSON.parse(rawValue);
    } catch {
      return null;
    }
  }
}

function hasSessionFromStorageCookie(rawValue: string | undefined) {
  if (!rawValue) return false;

  const parsed = decodeCookieValue(rawValue);
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }

  const sessionLike =
    (parsed as { currentSession?: { access_token?: string } }).currentSession ||
    (parsed as { session?: { access_token?: string } }).session ||
    parsed;

  return typeof sessionLike === 'object' && !!(sessionLike as { access_token?: string }).access_token;
}

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  );
}

function hasSupabaseSession(request: NextRequest) {
  if (request.cookies.has(ACCESS_TOKEN_COOKIE)) {
    return true;
  }

  if (LEGACY_STORAGE_COOKIE && hasSessionFromStorageCookie(request.cookies.get(LEGACY_STORAGE_COOKIE)?.value)) {
    return true;
  }

  if (hasSessionFromStorageCookie(request.cookies.get(FALLBACK_STORAGE_COOKIE)?.value)) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const { pathname } = nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (hasSupabaseSession(request)) {
    return NextResponse.next();
  }

  const redirectUrl = new URL('/login', request.url);
  redirectUrl.searchParams.set('redirectTo', `${pathname}${nextUrl.search}`);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
