// Lightweight GA4 helpers. Safe to call before gtag loads (queues via dataLayer).
const GA_MEASUREMENT_ID = "G-TPCE2DBF86";

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

export function trackEvent(name: string, params?: Record<string, unknown>, callback?: () => void) {
  if (typeof window === "undefined") return;
  try {
    let callbackCalled = false;
    const done = () => {
      if (callbackCalled) return;
      callbackCalled = true;
      callback?.();
    };
    const eventParams = {
      send_to: GA_MEASUREMENT_ID,
      transport_type: "beacon",
      ...(callback ? { event_callback: done, event_timeout: 1000 } : {}),
      ...(params ?? {}),
    };
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${name}`, eventParams);
    if (typeof window.gtag === "function") {
      window.gtag("event", name, eventParams);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(["event", name, eventParams]);
      if (callback) window.setTimeout(done, 50);
    }
  } catch {
    callback?.();
    /* noop */
  }
}
