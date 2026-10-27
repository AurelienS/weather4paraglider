import { expect, test, type Page } from "@playwright/test";
import { blockTiles, mockOpenMeteo, mockUmami, type UmamiEvent } from "./mock";

test.beforeEach(async ({ page }: { page: Page }) => {
  await blockTiles(page);
});

const pageViews = async (events: () => Promise<UmamiEvent[]>): Promise<unknown[]> =>
  (await events()).filter((e) => e.type === "pageview").map((e) => e.url);

test("without configuration nothing analytics-related happens", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  // no tracker script injected, no window.umami, no W4P_ANALYTICS
  await expect(page.locator("script[data-website-id]")).toHaveCount(0);
  const state = await page.evaluate(() => ({
    umami: typeof window.umami,
    config: (window as { W4P_ANALYTICS?: unknown }).W4P_ANALYTICS,
  }));
  expect(state.umami).toBe("undefined");
  expect(state.config).toBeUndefined();
});

test("configured analytics sends one page view per page, not per selection", async ({
  page,
}) => {
  const om = await mockOpenMeteo(page);
  const umami = await mockUmami(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();

  // the tracker script carries the site id and opts out of auto-tracking
  const script = page.locator("script[data-website-id]");
  await expect(script).toHaveCount(1);
  await expect(script).toHaveAttribute("data-website-id", "e2e-website-id");
  await expect(script).toHaveAttribute("data-auto-track", "false");

  // the initial page view is queued and flushed once the script loads
  await expect.poll(() => pageViews(umami.events)).toEqual(["/place"]);

  // the guide is the only other page; coming back is a page view too
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(page.locator(".guide")).toBeVisible();
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".wg").first()).toBeVisible();
  await expect.poll(() => pageViews(umami.events)).toEqual(["/place", "/guide", "/place"]);

  // a model switch stays on the place page: no extra page view, one event
  await page.locator(".model-plate").nth(1).click();
  await expect(page.locator(".model-plate").nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(page).toHaveURL(/model=icon_d2/);
  expect(await pageViews(umami.events)).toEqual(["/place", "/guide", "/place"]);

  const events = await umami.events();
  expect(events.filter((e) => e.type === "event")).toEqual([
    { type: "event", name: "model_selected", data: { model: "icon_d2" } },
  ]);
  expect(om.calls()).toBeGreaterThan(0);
});
