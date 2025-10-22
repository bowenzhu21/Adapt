import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json(
      { error: 'Missing conversationId query parameter.' },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('ui_state')
    .select('theme, components')
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: 'UI state not found.' }, { status: 404 });
  }

  return NextResponse.json(
    {
      theme: data.theme ?? null,
      components: Array.isArray(data.components) ? data.components : [],
    },
    { status: 200 },
  );
}
