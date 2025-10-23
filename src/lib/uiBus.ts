export type UiBusSubscriber = (payload?: unknown) => void;

export interface UiBus {
  on(event: string, fn: UiBusSubscriber): () => void;
  emit(event: string, payload?: unknown): void;
}

class SimpleUiBus implements UiBus {
  private listeners = new Map<string, Set<UiBusSubscriber>>();

  on(event: string, fn: UiBusSubscriber): () => void {
    const set = this.listeners.get(event) ?? new Set<UiBusSubscriber>();
    set.add(fn);
    this.listeners.set(event, set);

    return () => {
      const current = this.listeners.get(event);
      if (!current) return;
      current.delete(fn);
      if (current.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit(event: string, payload?: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;

    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (error) {
        console.error(`uiBus listener for "${event}" failed`, error);
      }
    }
  }
}

export const uiBus: UiBus = new SimpleUiBus();
