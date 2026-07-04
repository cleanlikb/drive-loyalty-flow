// Lightweight GA4 helpers. Safe to call before gtag loads (queues via dataLayer).
const GA_MEASUREMENT_ID = "G-HW40JP52ZD";

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
    const eventParams = {
      send_to: GA_MEASUREMENT_ID,
      transport_type: "beacon",
      ...(params ?? {}),
    };
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${name}`, eventParams);
    if (typeof window.gtag === "function") {
      window.gtag("event", name, eventParams);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(["event", name, eventParams]);
    }
  } catch {
    /* noop */
  }
}
