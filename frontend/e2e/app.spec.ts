import { expect, test, type Page } from "@playwright/test";
import { blockTiles, mockOpenMeteo, mockPhoton } from "./mock";

test.beforeEach(async ({ page }: { page: Page }) => {
  await blockTiles(page);
});

test("renders the AROME windgram for the URL point", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page).toHaveURL(/model=arome_france/);
  await expect(page.locator(".meta")).toContainText("AROME 0.025°");
  await expect(page.locator(".meta")).toContainText("model alt. 1696");
  await expect(page.locator('.seg[aria-label="Day"] button')).toHaveCount(3);
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
});

test("model selection switches the forecast window and URL", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator('.seg[aria-label="Day"] button')).toHaveCount(3);

  const modelPick = page.getByLabel("Model");
  await expect(modelPick.locator("option")).toHaveCount(8);

  await modelPick.selectOption("arpege_europe");
  await expect(page).toHaveURL(/model=arpege_europe/);
  await expect(page.locator(".meta")).toContainText("arpege_europe");
  await expect(page.locator('.seg[aria-label="Day"] button')).toHaveCount(4);

  await modelPick.selectOption("arome_france_hd");
  await expect(page).toHaveURL(/model=arome_france_hd/);
  await expect(page.locator(".meta")).toContainText("0.01°");
  await expect(page.locator('.seg[aria-label="Day"] button')).toHaveCount(2);

  await modelPick.selectOption("meteoswiss_icon_ch1");
  await expect(page).toHaveURL(/model=meteoswiss_icon_ch1/);
  await expect(page.locator(".meta")).toContainText("meteoswiss_icon_ch1");
  await expect(page.locator('.seg[aria-label="Day"] button')).toHaveCount(5);

  // switching back to arome_france hits the localStorage cache again
  const before = om.calls();
  await modelPick.selectOption("arome_france");
  await expect(page.locator(".meta")).toContainText("0.025°");
  expect(om.calls()).toBe(before);
});

test("15-minute nowcast model decimates to hourly and caches", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71&model=arome_france_15min");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator(".meta")).toContainText("arome_france_15min");
  expect(om.urls().some((u) => u.includes("minutely_15="))).toBe(true);
  const after = om.calls();
  await page.reload();
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  expect(om.calls()).toBe(after);
});

test("model without coverage for the point says so without calling the API", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto("/?lat=43.29&lon=-0.37&model=meteoswiss_icon_ch1");
  const banner = page.locator(".banner.error");
  await expect(banner).toContainText("MeteoSwiss ICON CH1 1 km has no data for this location");
  await expect(banner).toContainText("Pick another model");
  expect(om.calls()).toBe(0);
});

test("out-of-domain API response maps to a model-not-available message", async ({ page }) => {
  const om = await mockOpenMeteo(page, { noDataFor: "icon_d2" });
  await page.goto("/?lat=43.30&lon=5.37&model=icon_d2");
  const banner = page.locator(".banner.error");
  await expect(banner).toContainText("DWD ICON D2 2.2 km has no data for this location");
  await expect(banner.locator('button:has-text("Retry")')).toBeVisible();
  expect(om.calls()).toBe(1);
});

test("without URL params, falls back to the Aravis demo point", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/");
  await expect(page).toHaveURL(/lat=45\.945&lon=6\.71/);
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
});

test("reloading reads the localStorage cache without calling Open-Meteo", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  const afterFirstLoad = om.calls();
  expect(afterFirstLoad).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  expect(om.calls()).toBe(afterFirstLoad);
});

test("Refresh forces a new Open-Meteo call", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  const before = om.calls();
  await page.locator('button:has-text("Refresh")').click();
  await expect(page.locator('button:has-text("Refresh")')).toBeEnabled({ timeout: 15_000 });
  expect(om.calls()).toBeGreaterThan(before);
});

test("a failed refresh keeps the displayed data", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  const cells = await page.locator(".wg td.cell").count();
  await page.unrouteAll();
  await blockTiles(page);
  await page.route("**/api.open-meteo.com/**", (route) => route.abort());
  await page.locator('button:has-text("Refresh")').click();
  await expect(page.locator(".banner.error")).toContainText(
    "Could not reach Open-Meteo — check your internet connection",
  );
  expect(await page.locator(".wg td.cell").count()).toBe(cells);
  await page.unrouteAll();
  const om2 = await mockOpenMeteo(page);
  await page.locator('.banner.error button:has-text("Retry")').click();
  await expect(page.locator(".banner.error")).toHaveCount(0);
  expect(om2.calls()).toBeGreaterThan(0);
});

test("Open-Meteo quota exceeded: plain-language message and Retry button", async ({ page }) => {
  await mockOpenMeteo(page, { status: 429 });
  await page.goto("/?lat=45.945&lon=6.71");
  const banner = page.locator(".banner.error");
  await expect(banner).toContainText("Open-Meteo rate limit reached for your connection");
  await expect(banner).toContainText("try again in a few minutes");
  await expect(banner.locator('button:has-text("Retry")')).toBeVisible();
});

test("no network: connection message", async ({ page }) => {
  await page.route("**/api.open-meteo.com/**", (route) => route.abort());
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".banner.error")).toContainText(
    "Could not reach Open-Meteo — check your internet connection",
  );
});

test("0 °C isotherm sits between the sub-zero and above-zero cells", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  const warmRow = page.locator('.wg tbody tr:has(th:text-is("2250"))');
  const coldRow = page.locator('.wg tbody tr:has(th:text-is("2500"))');
  await expect(warmRow.locator("td.cell").first()).toHaveClass(/iso0/);
  await expect(coldRow.locator("td.cell").first()).not.toHaveClass(/iso0/);
});

test("layout stays put while loading and after picking a place", async ({ page }) => {
  const om = await mockOpenMeteo(page, { delay: 600 });
  await mockPhoton(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  const tableTop = await page
    .locator(".wg")
    .evaluate((el) => el.getBoundingClientRect().top);
  const headerBottom = await page
    .locator("header.top")
    .evaluate((el) => el.getBoundingClientRect().bottom);

  await page.locator('button:has-text("Refresh")').click();
  await expect(page.locator(".banner")).toBeVisible();
  const duringLoad = await page
    .locator(".wg")
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(duringLoad - tableTop)).toBeLessThan(1);
  await expect(page.locator('button:has-text("Refresh")')).toBeEnabled({ timeout: 15_000 });

  await page.locator("#place").fill("chamo");
  await expect(page.locator(".place-menu")).toBeVisible();
  await page.locator('.place-menu button:has-text("Chamonix-Mont-Blanc")').click();
  await expect(page.locator(".place-chip strong")).toContainText("Chamonix-Mont-Blanc");
  const afterPlace = await page
    .locator(".wg")
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(afterPlace - tableTop)).toBeLessThan(1);
  const headerBottomAfter = await page
    .locator("header.top")
    .evaluate((el) => el.getBoundingClientRect().bottom);
  expect(Math.abs(headerBottomAfter - headerBottom)).toBeLessThan(1);
  const chipBox = await page.locator(".place-chip").boundingBox();
  const inputBox = await page.locator("#place").boundingBox();
  const actionsBox = await page.locator(".site-form-actions").boundingBox();
  expect(chipBox!.y).toBeGreaterThanOrEqual(inputBox!.y + inputBox!.height);
  expect(chipBox!.y + chipBox!.height).toBeLessThanOrEqual(actionsBox!.y);
  expect(om.calls()).toBeGreaterThan(1);
});

test("day tabs stop at the last hour that actually carries data", async ({ page }) => {
  await mockOpenMeteo(page, { nullsAfterHours: 48 });
  await page.goto("/?lat=45.945&lon=6.71&model=meteoswiss_icon_ch1");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator('.seg[aria-label="Day"] button')).toHaveCount(2);
  await expect(page.locator(".meta")).toContainText("meteoswiss_icon_ch1");
});

test("place search loads a new point", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhoton(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await page.locator("#place").fill("chamo");
  const menu = page.locator(".place-menu");
  await expect(menu).toBeVisible();
  await expect(menu.locator(".pl-label").first()).toHaveText("Chamonix-Mont-Blanc");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/lat=45\.9231&lon=6\.8692/);
  await expect(page.locator(".place-chip strong")).toContainText("Chamonix-Mont-Blanc");
  await expect(page.locator(".meta")).toContainText("45.923°N 6.869°E");
});

test("favorites: default sites, selection, add, remove and persistence", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhoton(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();

  const favBtn = page.locator(".fav-menu > button");
  await favBtn.click();
  await expect(page.locator(".fav-item")).toHaveCount(10);
  await expect(page.locator(".fav-item:has-text('Puy de Dôme')")).toBeVisible();

  await page.locator(".fav-item:has-text('Puy de Dôme')").click();
  await expect(page).toHaveURL(/lat=45\.7726&lon=2\.9646/);
  await expect(page.locator(".place-chip strong")).toHaveText("Puy de Dôme");

  await favBtn.click();
  await expect(page.locator(".fav-add")).toBeDisabled();
  await page.mouse.click(20, 500);

  await page.locator("#place").fill("chamo");
  await expect(page.locator(".place-menu")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".place-chip strong")).toContainText("Chamonix-Mont-Blanc");

  await favBtn.click();
  await expect(favBtn).toHaveText("Favorites (10)");
  await expect(page.locator(".fav-add")).toBeEnabled();
  await page.locator(".fav-add").click();
  await expect(favBtn).toHaveText("Favorites (11)");

  await page.locator('.fav-list li:has-text("Aravis") .fav-remove').click();
  await expect(favBtn).toHaveText("Favorites (10)");
  await page.mouse.click(20, 500);

  await page.reload();
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await favBtn.click();
  await expect(page.locator(".fav-item")).toHaveCount(10);
  await expect(page.locator(".fav-item:has-text('Aravis')")).toHaveCount(0);
  await expect(page.locator(".fav-item:has-text('Chamonix-Mont-Blanc')")).toHaveCount(1);
});

test("map picking and Escape to close", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhoton(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();

  await page.locator('button:has-text("Map…")').click();
  const panel = page.locator(".map-panel");
  await expect(panel).toBeVisible();
  const latIn = page.locator('input[aria-label="Latitude"]');
  const lonIn = page.locator('input[aria-label="Longitude"]');
  await expect(latIn).toHaveValue("45.94500");
  await expect(lonIn).toHaveValue("6.71000");

  await page.keyboard.press("Escape");
  await expect(page.locator(".map-overlay")).toHaveCount(0);

  await page.locator('button:has-text("Map…")').click();
  await expect(panel).toBeVisible();
  const box = await page.locator(".map-holder").boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + 140, box!.y + 100);
  const nextLat = await latIn.inputValue();
  const nextLon = await lonIn.inputValue();
  expect(nextLat).not.toBe("45.94500");
  await expect(page.locator(".map-near")).toContainText("Chamonix-Mont-Blanc");

  await page.locator('button:has-text("Use this point")').click();
  await expect(page.locator(".map-overlay")).toHaveCount(0);
  const url = new URL(page.url());
  expect(Math.abs(Number(url.searchParams.get("lat")) - Number(nextLat))).toBeLessThan(1e-5);
  expect(Math.abs(Number(url.searchParams.get("lon")) - Number(nextLon))).toBeLessThan(1e-5);
  await expect(page.locator(".place-chip")).toContainText("Chamonix-Mont-Blanc");
});
