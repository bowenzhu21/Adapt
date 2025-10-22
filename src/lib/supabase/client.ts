import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

const ACCESS_TOKEN_COOKIE = 'sb-access-token';
const REFRESH_TOKEN_COOKIE = 'sb-refresh-token';
const STORAGE_COOKIE = 'supabase-auth-token';

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getCookieSuffix() {
  const parts = ['path=/', 'sameSite=Lax'];
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    parts.push('secure');
  }
  return parts.join('; ');
}

function setCookie(name: string, value: string, maxAgeSeconds?: number) {
  if (!isBrowser()) return;

  const encodedValue = encodeURIComponent(value);
  const attributes = [getCookieSuffix()];

  if (typeof maxAgeSeconds === 'number') {
    const safeMaxAge = Math.max(0, Math.floor(maxAgeSeconds));
    attributes.push(`max-age=${safeMaxAge}`);
  }

  document.cookie = `${name}=${encodedValue}; ${attributes.join('; ')}`;
}

function clearCookie(name: string) {
  if (!isBrowser()) return;

  document.cookie = `${name}=; ${getCookieSuffix()}; max-age=0`;
}

function getSessionMaxAge(session: Session | null) {
  if (!session?.expires_at) {
    return undefined;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return Math.max(0, session.expires_at - nowInSeconds);
}

function syncAuthCookies(session: Session | null) {
  if (!session) {
    clearCookie(ACCESS_TOKEN_COOKIE);
    clearCookie(REFRESH_TOKEN_COOKIE);
    clearCookie(STORAGE_COOKIE);
    return;
  }

  const maxAge = getSessionMaxAge(session);
  setCookie(ACCESS_TOKEN_COOKIE, session.access_token, maxAge);

  if (session.refresh_token) {
    // Refresh tokens typically last longer than access tokens, so fall back to 30 days.
    setCookie(REFRESH_TOKEN_COOKIE, session.refresh_token, maxAge ?? 60 * 60 * 24 * 30);
  } else {
    clearCookie(REFRESH_TOKEN_COOKIE);
  }

  const payload = JSON.stringify({
    currentSession: session,
  });
  setCookie(STORAGE_COOKIE, payload, maxAge);
}

async function initializeAuthCookieSync() {
  const { data } = await supabase.auth.getSession();
  syncAuthCookies(data.session ?? null);

  supabase.auth.onAuthStateChange((_event, session) => {
    syncAuthCookies(session);
  });
}

if (isBrowser()) {
  void initializeAuthCookieSync();
}
