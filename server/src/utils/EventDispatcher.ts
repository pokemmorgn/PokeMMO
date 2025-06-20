// utils/EventDispatcher.ts
type Listener<T> = (payload: T) => void;

export class EventDispatcher<E extends Record<string, any>> {
  private listeners: { [K in keyof E]?: Listener<E[K]>[] } = {};

  on<K extends keyof E>(event: K, listener: Listener<E[K]>) {
    (this.listeners[event] ||= []).push(listener);
  }

  off<K extends keyof E>(event: K, listener: Listener<E[K]>) {
    const arr = this.listeners[event];
    if (!arr) return;
    const idx = arr.indexOf(listener);
    if (idx >= 0) arr.splice(idx, 1);
  }

  emit<K extends keyof E>(event: K, payload: E[K]) {
    for (const l of this.listeners[event] || []) l(payload);
  }
}
