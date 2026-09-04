import { describe, expect, test, vi } from "vitest";
import { createTracker, resolveAnalyticsConfig } from "./analytics";
import type { TrackerPayload } from "./analytics";

describe("resolveAnalyticsConfig", () => {
  test("returns null without configuration (dev, tests, self-hosted)", () => {
    expect(resolveAnalyticsConfig({})).toBeNull();
    expect(resolveAnalyticsConfig({ VITE_UMAMI_SRC: "https://x/script.js" })).toBeNull();
  });

  test("reads the build-time env vars", () => {
    expect(
      resolveAnalyticsConfig({
        VITE_UMAMI_SRC: "https://cloud.umami.is/script.js",
        VITE_UMAMI_WEBSITE_ID: "abc-123",
        VITE_UMAMI_DOMAINS: "weather4paragliding.example",
      }),
    ).toEqual({
      src: "https://cloud.umami.is/script.js",
      websiteId: "abc-123",
      domains: "weather4paragliding.example",
    });
  });

  test("blank or non-string env values are not a config", () => {
    expect(
      resolveAnalyticsConfig({ VITE_UMAMI_SRC: "  ", VITE_UMAMI_WEBSITE_ID: "abc" }),
    ).toBeNull();
    expect(
      resolveAnalyticsConfig({ VITE_UMAMI_SRC: "https://x", VITE_UMAMI_WEBSITE_ID: 42 }),
    ).toBeNull();
  });

  test("a valid runtime override wins over the env vars", () => {
    const env = { VITE_UMAMI_SRC: "https://env/script.js", VITE_UMAMI_WEBSITE_ID: "env-id" };
    expect(resolveAnalyticsConfig(env, { src: "https://rt/script.js", websiteId: "rt-id" })).toEqual({
      src: "https://rt/script.js",
      websiteId: "rt-id",
      domains: undefined,
    });
  });

  test("an invalid runtime override falls back to the env vars", () => {
    const env = { VITE_UMAMI_SRC: "https://env/script.js", VITE_UMAMI_WEBSITE_ID: "env-id" };
    expect(resolveAnalyticsConfig(env, { src: "https://rt/script.js" })).toEqual({
      src: "https://env/script.js",
      websiteId: "env-id",
      domains: undefined,
    });
    expect(resolveAnalyticsConfig(env, { src: 123, websiteId: true })).toEqual({
      src: "https://env/script.js",
      websiteId: "env-id",
      domains: undefined,
    });
  });
});

describe("createTracker", () => {
  function newTracker() {
    const sent: TrackerPayload[] = [];
    return { sent, tracker: createTracker((payload) => sent.push(payload)) };
  }

  test("maps the pages to stable synthetic paths", () => {
    const { sent, tracker } = newTracker();
    tracker.ready();
    tracker.pageView("place");
    tracker.pageView("compare-places");
    tracker.pageView("compare-models");
    tracker.pageView("guide");
    expect(sent).toEqual([
      { type: "pageview", url: "/place" },
      { type: "pageview", url: "/compare/places" },
      { type: "pageview", url: "/compare/models" },
      { type: "pageview", url: "/guide" },
    ]);
  });

  test("queues the initial page view until the script loads", () => {
    const { sent, tracker } = newTracker();
    tracker.pageView("place");
    expect(sent).toEqual([]);
    tracker.ready();
    expect(sent).toEqual([{ type: "pageview", url: "/place" }]);
    tracker.ready();
    expect(sent).toHaveLength(1);
  });

  test("ignores consecutive duplicate page views", () => {
    const { sent, tracker } = newTracker();
    tracker.ready();
    tracker.pageView("place");
    tracker.pageView("place");
    expect(sent).toEqual([{ type: "pageview", url: "/place" }]);
    // a real navigation back to a previous page is a page view again
    tracker.pageView("compare-models");
    tracker.pageView("place");
    expect(
      sent.filter((p) => p.type === "pageview").map((p) => (p as { url: string }).url),
    ).toEqual(["/place", "/compare/models", "/place"]);
  });

  test("drops custom events raised before the script loads", () => {
    const { sent, tracker } = newTracker();
    tracker.event("model_selected", { model: "arome_france" });
    expect(sent).toEqual([]);
    tracker.ready();
    tracker.event("model_selected", { model: "arome_france" });
    expect(sent).toEqual([
      { type: "event", name: "model_selected", data: { model: "arome_france" } },
    ]);
  });

  test("events without data are sent as-is", () => {
    const { sent, tracker } = newTracker();
    tracker.ready();
    tracker.event("shared");
    expect(sent).toEqual([{ type: "event", name: "shared", data: undefined }]);
  });

  test("send failures do not break the tracker", () => {
    const send = vi.fn(() => {
      throw new Error("offline");
    });
    const tracker = createTracker(send);
    tracker.ready();
    expect(() => tracker.pageView("place")).not.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
