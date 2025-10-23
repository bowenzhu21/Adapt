export type AppIntent =
  | 'plan'
  | 'focus'
  | 'calm'
  | 'create'
  | 'reflect'
  | 'chat'
  | 'unknown';

export type MemoryHit = {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export type UiComponent = {
  type: string;
  props: Record<string, unknown>;
};

export type UiTheme = {
  palette?: { bg?: string; fg?: string; primary?: string; accent?: string };
  motion?: 'slow' | 'normal' | 'snappy';
  font?: string;
  density?: 'cozy' | 'comfy' | 'compact';
};

export type UiPlan = {
  intent: AppIntent | string;
  emotion: string;
  confidence: number;
  theme: UiTheme;
  components: UiComponent[];
};

export type ChainInput = {
  userId: string;
  conversationId: string;
  message: string;
  intentHint?: AppIntent;
  emotionHint?: string;
};
