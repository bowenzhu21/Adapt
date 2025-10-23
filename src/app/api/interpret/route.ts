import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { interpretChain } from '@/lib/lc/chain';
import type { UiPlan } from '@/lib/lc/types';
import { SAFE_PLAN } from '@/lib/lc/planUtils';
import { classifyIntent } from '@/lib/lc/intent';
import { classifyEmotion, defaultEmotionForIntent } from '@/lib/lc/emotion';
import OpenAI from 'openai';

export const runtime = 'nodejs';

type InterpretRequestBody = {
  conversationId?: string;
  message?: string;
};

const FALLBACK_PLAN: UiPlan = SAFE_PLAN;

function validatePayload(body: InterpretRequestBody) {
  if (!body || typeof body !== 'object') {
    return 'Invalid JSON payload.';
  }

  if (typeof body.conversationId !== 'string' || body.conversationId.trim().length === 0) {
    return 'conversationId is required.';
  }

  if (typeof body.message !== 'string' || body.message.trim().length === 0) {
    return 'message is required.';
  }

  return null;
}

export async function POST(request: Request) {
  let body: InterpretRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const validationError = validatePayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const conversationId = body.conversationId!.trim();
  const message = body.message!.trim();

  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const {
      data: msgRows,
      error: msgErr,
    } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
      })
      .select('id')
      .single();

    if (msgErr || !msgRows) {
      const messageText = msgErr?.message ?? 'Failed to insert message.';
      const lowered = messageText.toLowerCase();
      const status =
        msgErr?.code === '42501' || lowered.includes('row level security') ? 403 : 500;
      return NextResponse.json({ error: messageText }, { status });
    }

    const messageId = msgRows.id as string;

    const intentHint = classifyIntent(message);
    const emotionHintFromText = classifyEmotion(message);
    const emotionHint =
      emotionHintFromText !== 'neutral'
        ? emotionHintFromText
        : defaultEmotionForIntent(intentHint);

    let plan: UiPlan;
    try {
      plan = await interpretChain.invoke({
        userId: user.id,
        conversationId,
        message,
        intentHint,
        emotionHint,
      });
      console.log(
        '[interpret] intent=%s emotion=%s comps=%o',
        plan.intent,
        plan.emotion,
        Array.isArray(plan.components) ? plan.components.map((component) => component.type) : [],
      );
    } catch (error) {
      console.error('interpretChain failed', error);
      plan = FALLBACK_PLAN;
    }

    const interpretationInsert = await supabase.from('interpretations').insert({
      message_id: messageId,
      intent: plan.intent,
      emotion: plan.emotion,
      confidence: plan.confidence ?? 0.6,
      theme: plan.theme,
      components: plan.components,
    });

    if (interpretationInsert.error) {
      const messageText =
        interpretationInsert.error.message ?? 'Failed to insert interpretation.';
      const lowered = messageText.toLowerCase();
      const status =
        interpretationInsert.error.code === '42501' || lowered.includes('row level security')
          ? 403
          : 500;
      return NextResponse.json({ error: messageText }, { status });
    }

    const replyPrompt = `In one or two short sentences, reply to the user conversationally based on their last message and the planned UI intent "${plan.intent}" and emotion "${plan.emotion}". Keep it crisp and helpful.`;
    let reply: string | null = null;
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const replyRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'You are Adapt, a concise helpful assistant.' },
          { role: 'user', content: message },
          { role: 'assistant', content: replyPrompt },
        ],
      });
      reply = replyRes.choices[0]?.message?.content?.trim() || null;
    } catch (error) {
      console.error('Reply generation failed', error);
    }

    if (reply) {
      const replyInsert = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: reply,
      });
      if (replyInsert.error) {
        console.error('Failed to store assistant reply', replyInsert.error);
      }
    }

    const upsertResult = await supabase
      .from('ui_state')
      .upsert(
        {
          conversation_id: conversationId,
          theme: plan.theme,
          components: plan.components,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'conversation_id' },
      );

    if (upsertResult.error) {
      const messageText = upsertResult.error.message ?? 'Failed to update UI state.';
      const lowered = messageText.toLowerCase();
      const status =
        upsertResult.error.code === '42501' || lowered.includes('row level security') ? 403 : 500;
      return NextResponse.json({ error: messageText }, { status });
    }

    return NextResponse.json(
      {
        theme: plan.theme,
        components: plan.components,
        emotion: plan.emotion,
        intent: plan.intent,
        reply,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Interpretation route error', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
