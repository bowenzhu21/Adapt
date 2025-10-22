import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type InterpretRequestBody = {
  conversationId?: string;
  message?: string;
};

const FALLBACK_PLAN = {
  intent: 'chat',
  emotion: 'curious',
  confidence: 0.6,
  theme: {
    palette: {
      bg: '#0f172a',
      fg: '#e2e8f0',
      primary: '#6366f1',
      accent: '#a855f7',
    },
    motion: 'normal' as const,
    font: 'Inter',
    density: 'comfy' as const,
    emotion: 'curious',
    intent: 'chat',
  },
  components: [{ type: 'chat', props: {} }],
};

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

async function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable.');
  }

  return new OpenAI({ apiKey });
}

function parsePlanResponse(content: string | null | undefined) {
  if (!content) {
    return FALLBACK_PLAN;
  }

  try {
    const parsed = JSON.parse(content);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.intent !== 'string' ||
      typeof parsed.emotion !== 'string' ||
      typeof parsed.confidence !== 'number' ||
      !parsed.theme ||
      typeof parsed.theme !== 'object' ||
      !parsed.components ||
      !Array.isArray(parsed.components)
    ) {
      return FALLBACK_PLAN;
    }

    return {
      intent: parsed.intent,
      emotion: parsed.emotion,
      confidence: parsed.confidence,
      theme: parsed.theme,
      components: parsed.components,
    };
  } catch {
    return FALLBACK_PLAN;
  }
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

    const openai = await createOpenAIClient();

    let plan = FALLBACK_PLAN;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              "You are an empathetic UI interpreter. Analyze the message and return the UI plan as strict JSON. Use only these component types: chat, journal, todo, breathing, header, text, button, timer, footer. Prefer a single header plus brief text for simple responses. For focus requests, include exactly one timer with a meaningful seconds value and a button whose action is 'timer:start'. For calming requests, include one breathing component with pattern '4-4-4' or '4-7-8'. Button actions must be one of ['timer:start','timer:pause','timer:reset','logout'] and keep total components between 1 and 4. Keep copy short, gentle, and clear. If unsure, return a single text component with a friendly message.",
          },
          { role: 'user', content: message },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'UiPlan',
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['intent', 'emotion', 'confidence', 'theme', 'components'],
              properties: {
                intent: { type: 'string' },
                emotion: { type: 'string' },
                confidence: { type: 'number' },
                theme: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['palette', 'motion', 'font', 'density'],
                  properties: {
                    palette: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['bg', 'fg', 'primary', 'accent'],
                      properties: {
                        bg: { type: 'string' },
                        fg: { type: 'string' },
                        primary: { type: 'string' },
                        accent: { type: 'string' },
                      },
                    },
                    motion: { enum: ['slow', 'normal', 'snappy'] },
                    font: { type: 'string' },
                    density: { enum: ['cozy', 'comfy', 'compact'] },
                  },
                },
                components: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['type', 'props'],
                    properties: {
                      type: { type: 'string' },
                      props: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
        temperature: 0.2,
      });

      const content = completion.choices[0]?.message?.content ?? null;
      plan = parsePlanResponse(content);
    } catch (error) {
      console.error('OpenAI interpretation failed', error);
    }

    plan.theme = {
      ...plan.theme,
      emotion: plan.emotion,
      intent: plan.intent,
    };

    const { error: insertInterpretationError } = await supabase.from('interpretations').insert({
      message_id: messageId,
      intent: plan.intent,
      emotion: plan.emotion,
      confidence: plan.confidence,
      theme: plan.theme,
      components: plan.components,
    });

    if (insertInterpretationError) {
      const messageText =
        insertInterpretationError.message ?? 'Failed to insert interpretation.';
      const lowered = messageText.toLowerCase();
      const status =
        insertInterpretationError.code === '42501' || lowered.includes('row level security')
          ? 403
          : 500;
      return NextResponse.json({ error: messageText }, { status });
    }

    const { error: uiErr } = await supabase
      .from('ui_state')
      .upsert(
        {
          conversation_id: conversationId,
          theme: plan.theme,
          components: plan.components,
        },
        { onConflict: 'conversation_id' },
      );

    if (uiErr) {
      const messageText = uiErr.message ?? 'Failed to update UI state.';
      const lowered = messageText.toLowerCase();
      const status = uiErr.code === '42501' || lowered.includes('row level security') ? 403 : 500;
      return NextResponse.json({ error: messageText }, { status });
    }

    return NextResponse.json(
      {
        theme: plan.theme,
        components: plan.components,
        emotion: plan.emotion,
        intent: plan.intent,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Interpretation route error', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
