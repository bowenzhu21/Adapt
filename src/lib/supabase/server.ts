import { cookies } from 'next/headers';
import { createClient, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.');
}

const supabaseServiceKey = supabaseServiceRoleKey || supabaseAnonKey;
const ACCESS_TOKEN_COOKIE = 'sb-access-token';
const LEGACY_STORAGE_COOKIE = (() => {
  try {
    const hostname = new URL(supabaseUrl).hostname.split('.')[0];
    return `sb-${hostname}-auth-token`;
  } catch {
    return null;
  }
})();

function decodeCookieValue(rawValue: string) {
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

function extractAccessTokenFromStorageCookie(rawValue: string | undefined) {
  if (!rawValue) return null;

  const parsed = decodeCookieValue(rawValue);
  if (!parsed || typeof parsed !== 'object') return null;

  const sessionLike =
    (parsed as { currentSession?: { access_token?: string } }).currentSession ||
    (parsed as { session?: { access_token?: string } }).session ||
    parsed;

  if (!sessionLike || typeof sessionLike !== 'object') return null;

  return (sessionLike as { access_token?: string }).access_token ?? null;
}

async function getAccessToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) {
    return accessToken;
  }

  if (LEGACY_STORAGE_COOKIE) {
    const legacyToken = extractAccessTokenFromStorageCookie(
      cookieStore.get(LEGACY_STORAGE_COOKIE)?.value,
    );
    if (legacyToken) {
      return legacyToken;
    }
  }

  const fallback = extractAccessTokenFromStorageCookie(
    cookieStore.get('supabase-auth-token')?.value,
  );

  return fallback;
}

export async function createServerSupabaseClient() {
  const accessToken = await getAccessToken();

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    },
  });
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function getUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (typeof error.message === 'string' && error.message.toLowerCase().includes('session')) {
      return null;
    }

    throw error;
  }

  return data.user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();

  if (!user) {
    throw new Error('User must be authenticated.');
  }

  return user;
}
