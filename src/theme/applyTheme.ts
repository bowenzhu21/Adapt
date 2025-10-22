type ThemePalette = {
  bg?: string;
  fg?: string;
  primary?: string;
  accent?: string;
};

type Theme = {
  palette?: ThemePalette;
  motion?: 'slow' | 'normal' | 'snappy';
  density?: 'cozy' | 'comfy' | 'compact';
  font?: string;
};

const FALLBACK_BG: [number, number, number] = [15, 23, 42];
const FALLBACK_FG: [number, number, number] = [226, 232, 240];
const FALLBACK_PRIMARY: [number, number, number] = [99, 102, 241];
const FALLBACK_ACCENT: [number, number, number] = [168, 85, 247];

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function hexToRgb(hex?: string): [number, number, number] | null {
  if (!hex || typeof hex !== 'string') return null;
  let normalized = hex.trim().replace('#', '');
  if (!(normalized.length === 3 || normalized.length === 6)) return null;
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return null;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return [r, g, b];
}

function rgbToCss(tuple: [number, number, number]): string {
  return `${Math.round(tuple[0])} ${Math.round(tuple[1])} ${Math.round(tuple[2])}`;
}

function mixRgb(
  base: [number, number, number],
  target: [number, number, number],
  amount: number,
): [number, number, number] {
  const clampAmount = Math.min(Math.max(amount, 0), 1);
  return [
    base[0] + (target[0] - base[0]) * clampAmount,
    base[1] + (target[1] - base[1]) * clampAmount,
    base[2] + (target[2] - base[2]) * clampAmount,
  ];
}

function ensureOverlay(): HTMLDivElement | null {
  const body = document.body;
  if (!body) return null;

  let overlay = document.getElementById('theme-transition-overlay') as HTMLDivElement | null;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'theme-transition-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.opacity = '0';
    overlay.style.background = 'rgba(0, 0, 0, 0)';
    overlay.style.transition = 'opacity 300ms ease';
    overlay.style.zIndex = '2147483646';
    body.appendChild(overlay);
  }

  return overlay;
}

export function applyTheme(theme: Theme | null | undefined): void {
  if (!isBrowser()) return;

  const root = document.documentElement;
  const palette = theme?.palette ?? {};

  const bg = hexToRgb(palette.bg) ?? FALLBACK_BG;
  const fg = hexToRgb(palette.fg) ?? FALLBACK_FG;
  const primary = hexToRgb(palette.primary) ?? FALLBACK_PRIMARY;
  const accent = hexToRgb(palette.accent) ?? FALLBACK_ACCENT;

  const gradientFrom = mixRgb(bg, primary, 0.35);
  const gradientTo = mixRgb(bg, accent, 0.55);

  root.style.setProperty('--bg', rgbToCss(bg));
  root.style.setProperty('--fg', rgbToCss(fg));
  root.style.setProperty('--primary', rgbToCss(primary));
  root.style.setProperty('--accent', rgbToCss(accent));
  root.style.setProperty('--bg-gradient-from', rgbToCss(gradientFrom));
  root.style.setProperty('--bg-gradient-to', rgbToCss(gradientTo));
  root.style.setProperty('--shadow-accent', rgbToCss(accent));

  root.dataset.motion = theme?.motion ?? 'normal';
  root.dataset.density = theme?.density ?? 'comfy';

  if (theme?.font) {
    root.style.setProperty('--font-family', theme.font);
  } else {
    root.style.removeProperty('--font-family');
  }

  const overlay = ensureOverlay();
  if (overlay) {
    const computed = getComputedStyle(root);
    const motionDuration = computed.getPropertyValue('--motion-duration').trim() || '300ms';
    const durationMs = Number.parseFloat(motionDuration) || 300;
    overlay.style.transitionDuration = motionDuration;
    overlay.style.background = `rgb(${rgbToCss(mixRgb(bg, accent, 0.15))} / 0.35)`;
    overlay.style.opacity = '0';
    void overlay.offsetWidth;
    overlay.style.opacity = '0.3';
    window.setTimeout(() => {
      overlay.style.opacity = '0';
    }, durationMs);
  }

  window.dispatchEvent(new Event('theme:changed'));
}
