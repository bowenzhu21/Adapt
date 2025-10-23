import OpenAI from 'openai';
import { supabaseAdmin } from './server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type MemoryMetadata = Record<string, unknown>;

export type MemoryRecord = {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  similarity: number;
};

export async function storeUserMemory(
  userId: string,
  content: string,
  metadata: MemoryMetadata = {},
) {
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: content,
  });
  const [{ embedding }] = embeddingRes.data;

  await supabaseAdmin.from('user_memories').insert({
    user_id: userId,
    content,
    embedding,
    metadata,
  });
}

export async function retrieveUserMemories(
  userId: string,
  query: string,
  limit = 5,
): Promise<MemoryRecord[]> {
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const [{ embedding }] = embeddingRes.data;

  const { data, error } = await supabaseAdmin.rpc('match_user_memories', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: limit,
    user_id: userId,
  });

  if (error) throw error;
  const rows = Array.isArray(data) ? (data as unknown[]) : [];
  return rows.map((row): MemoryRecord => {
    const record = row as Record<string, unknown>;
    const metadataValue =
      record.metadata && typeof record.metadata === 'object'
        ? (record.metadata as MemoryMetadata)
        : {};
    return {
      id: typeof record.id === 'string' ? record.id : '',
      content: typeof record.content === 'string' ? record.content : '',
      metadata: metadataValue,
      similarity:
        typeof record.similarity === 'number'
          ? record.similarity
          : Number(record.similarity) || 0,
    };
  });
}
