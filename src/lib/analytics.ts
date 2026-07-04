// Lightweight GA4 helpers. Safe to call before gtag loads (queues via dataLayer).
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    Cal?: {
      ns?: Record<string, (...args: unknown[]) => void>;
      (...args: unknown[]): void;
    };
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params ?? {});
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: name, ...(params ?? {}) });
    }
  } catch {
    /* noop */
  }
}
