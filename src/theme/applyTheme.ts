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

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function hexToRgbTuple(hex: string): string | null {
  if (typeof hex !== 'string') {
    return null;
  }

  let normalized = hex.trim().replace('#', '');

  if (!(normalized.length === 3 || normalized.length === 6)) {
    return null;
  }

  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) {
    return null;
  }

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `${r} ${g} ${b}`;
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
  if (!isBrowser()) {
    return;
  }

  const root = document.documentElement;

  if (theme?.palette) {
    const entries: Array<[keyof ThemePalette, string]> = Object.entries(theme.palette)
      .filter((entry): entry is [keyof ThemePalette, string] => typeof entry[1] === 'string')
      .map(([key, value]) => [key as keyof ThemePalette, value as string]);

    entries.forEach(([key, value]) => {
      const rgbTuple = hexToRgbTuple(value);
      if (!rgbTuple) {
        return;
      }

      switch (key) {
        case 'bg':
          root.style.setProperty('--bg', rgbTuple);
          break;
        case 'fg':
          root.style.setProperty('--fg', rgbTuple);
          break;
        case 'primary':
          root.style.setProperty('--primary', rgbTuple);
          break;
        case 'accent':
          root.style.setProperty('--accent', rgbTuple);
          break;
        default:
          break;
      }
    });
  }

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
    const bgRgb = computed.getPropertyValue('--bg') || '0 0 0';
    const motionDuration = computed.getPropertyValue('--motion-duration').trim() || '300ms';
    const durationMs = Number.parseFloat(motionDuration) || 300;
    overlay.style.transitionDuration = motionDuration;
    overlay.style.background = `rgba(${bgRgb.trim() || '0 0 0'}, 0.35)`;
    overlay.style.opacity = '0';
    // Force reflow to restart transition
    void overlay.offsetWidth;
    overlay.style.opacity = '0.3';
    window.setTimeout(() => {
      overlay.style.opacity = '0';
    }, durationMs);
  }

  window.dispatchEvent(new Event('theme:changed'));
}
