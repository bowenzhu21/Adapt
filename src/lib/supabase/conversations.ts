import { supabase } from '@/lib/supabase/client';

export async function createConversation(): Promise<string> {
  const { data, error } = await supabase.rpc<string>('create_conversation');

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('create_conversation RPC did not return a conversation id.');
  }

  return data;
}

