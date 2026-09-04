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

  // navigating between pages sends one page view per page
  await page.getByRole("button", { name: "Compare models" }).click();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(page.locator(".guide")).toBeVisible();
  // entering compare places from the guide closes it and opens the board
  await page.getByRole("button", { name: "Compare places" }).click();
  await expect(page.locator(".board-card").first()).toBeVisible();
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".board-list")).toHaveCount(0);
  await expect
    .poll(() => pageViews(umami.events))
    .toEqual(["/place", "/compare/models", "/guide", "/compare/places", "/place"]);

  // selections that stay on the place page are not page views: no URL query
  // churn in the Pages report, and no events either
  await page.getByLabel("Model").selectOption("arpege_europe");
  await expect(page.locator(".meta")).toContainText("arpege_europe");
  await expect(page).toHaveURL(/model=arpege_europe/);
  expect(await pageViews(umami.events)).toEqual([
    "/place",
    "/compare/models",
    "/guide",
    "/compare/places",
    "/place",
  ]);

  // the model choice is a custom event carrying the model id
  const events = await umami.events();
  expect(events.filter((e) => e.type === "event")).toEqual([
    { type: "event", name: "model_selected", data: { model: "arpege_europe" } },
  ]);
  expect(om.calls()).toBeGreaterThan(0);
});
