/** Privacy-friendly analytics (Umami Cloud): no cookies, no banner, no
 * personal data. Fully opt-in — without configuration the module is a
 * no-op, so dev servers, tests and self-hosted builds stay analytics-free.
 *
 * Configuration (first match wins):
 * - runtime `window.W4P_ANALYTICS = { src, websiteId, domains? }`
 *   (lets a static deployment turn analytics on without a rebuild);
 * - build-time env vars `VITE_UMAMI_SRC` (script URL, e.g.
 *   `https://cloud.umami.is/script.js`) and `VITE_UMAMI_WEBSITE_ID`,
 *   with the optional `VITE_UMAMI_DOMAINS` to only track the prod domain.
 *
 * The app is a single HTML page whose "pages" live in the query string
 * (`?compare=1`, `?compare=models`, `?guide=1`). Auto-tracking is disabled
 * (`data-auto-track="false"`) and page views are sent with stable synthetic
 * paths instead, so the Pages report shows four clean rows (place, the two
 * compare boards, the guide) instead of one entry per pin or model choice.
 */

export type AnalyticsPage = "place" | "compare-places" | "compare-models" | "guide";

export type AnalyticsConfig = {
  /** Umami tracker script URL. */
  src: string;
  /** Umami website id (a UUID from the dashboard). */
  websiteId: string;
  /** Optional domain restriction (`data-domains`): track this site only. */
  domains?: string;
};

type RawConfig = { src?: unknown; websiteId?: unknown; domains?: unknown };

/** Page views use stable synthetic paths, not the real query string. */
const PAGE_PATHS: Record<AnalyticsPage, string> = {
  place: "/place",
  "compare-places": "/compare/places",
  "compare-models": "/compare/models",
  guide: "/guide",
};

function validConfig(raw: RawConfig | null | undefined): AnalyticsConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const src = typeof raw.src === "string" ? raw.src.trim() : "";
  const websiteId = typeof raw.websiteId === "string" ? raw.websiteId.trim() : "";
  if (!src || !websiteId) return null;
  const domains =
    typeof raw.domains === "string" && raw.domains.trim() ? raw.domains.trim() : undefined;
  return { src, websiteId, domains };
}

function envConfig(env: Record<string, unknown>): RawConfig {
  return {
    src: env.VITE_UMAMI_SRC,
    websiteId: env.VITE_UMAMI_WEBSITE_ID,
    domains: env.VITE_UMAMI_DOMAINS,
  };
}

/** Resolve the analytics config: the runtime override wins when it is
 * valid, otherwise the build-time env vars; null means "do not track". */
export function resolveAnalyticsConfig(
  env: Record<string, unknown>,
  runtime?: RawConfig | null,
): AnalyticsConfig | null {
  return validConfig(runtime) ?? validConfig(envConfig(env));
}

export type TrackerPayload =
  | { type: "pageview"; url: string }
  | { type: "event"; name: string; data?: Record<string, string | number> };

export type Tracker = {
  /** The tracker script finished loading: flush what was queued before. */
  ready: () => void;
  /** A page became active; consecutive duplicates are ignored. */
  pageView: (page: AnalyticsPage) => void;
  /** A named custom event; dropped when the script has not loaded yet. */
  event: (name: string, data?: Record<string, string | number>) => void;
};

/** Pure page-view/event state machine, independent from the DOM: it queues
 * the page view seen before the async tracker script loads and drops
 * consecutive duplicates (StrictMode re-runs, day/hour/pin selections that
 * leave the page unchanged). */
export function createTracker(send: (payload: TrackerPayload) => void): Tracker {
  let ready = false;
  let lastUrl: string | null = null;
  let pending = false;
  // analytics must never break the app: a failing send is swallowed
  const safeSend = (payload: TrackerPayload) => {
    try {
      send(payload);
    } catch {
      /* ignore */
    }
  };
  return {
    ready() {
      if (ready) return;
      ready = true;
      if (pending && lastUrl) safeSend({ type: "pageview", url: lastUrl });
      pending = false;
    },
    pageView(page) {
      const url = PAGE_PATHS[page];
      if (lastUrl === url) return;
      lastUrl = url;
      if (ready) safeSend({ type: "pageview", url });
      else pending = true;
    },
    event(name, data) {
      if (!ready) return;
      safeSend({ type: "event", name, data });
    },
  };
}

type UmamiProps = { url: string; referrer: string; website: string };

declare global {
  interface Window {
    umami?: {
      track: (
        arg?: ((props: UmamiProps) => Partial<UmamiProps>) | string,
        data?: Record<string, string | number>,
      ) => void;
    };
    W4P_ANALYTICS?: RawConfig;
  }
}

let tracker: Tracker | null = null;

/** Load the tracker script (once) and start collecting. Safe to call
 * unconditionally: without configuration nothing happens at all. */
export function initAnalytics(): void {
  if (typeof window === "undefined" || tracker) return;
  const config = resolveAnalyticsConfig(
    import.meta.env as Record<string, unknown>,
    window.W4P_ANALYTICS,
  );
  if (!config) return;
  tracker = createTracker((payload) => {
    if (!window.umami) return;
    if (payload.type === "pageview") {
      window.umami.track((props) => ({ ...props, url: payload.url }));
    } else {
      window.umami.track(payload.name, payload.data);
    }
  });
  const script = document.createElement("script");
  script.src = config.src;
  script.async = true;
  script.dataset.websiteId = config.websiteId;
  script.dataset.autoTrack = "false";
  if (config.domains) script.dataset.domains = config.domains;
  script.addEventListener("load", tracker.ready);
  document.head.appendChild(script);
}

/** Report the active page (call whenever the derived page changes). */
export function trackPageView(page: AnalyticsPage): void {
  tracker?.pageView(page);
}

/** Report a custom event (model picked, board shared…). */
export function trackEvent(name: string, data?: Record<string, string | number>): void {
  tracker?.event(name, data);
}
