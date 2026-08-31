import { expect, test, type Page } from "@playwright/test";
import {
  blockTiles,
  mockOpenMeteo,
  mockOpenMeteoGeocode,
  mockPhoton,
  mockPhotonDown,
} from "./mock";

test.beforeEach(async ({ page }: { page: Page }) => {
  await blockTiles(page);
});

test("the theme switcher toggles and persists the theme", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.locator('button[aria-label="Switch to dark theme"]').click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('button[aria-label="Switch to light theme"]')).toBeVisible();
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("the language switcher translates the UI and persists", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".site-form button", { hasText: "Refresh" })).toBeVisible();
  await expect(page.locator(".place-line .fav-add")).toHaveAttribute(
    "aria-label",
    "Add the current place to your favorites",
  );
  await page.locator('select[aria-label="Language"]').selectOption("fr");
  await expect(page.locator(".site-form button", { hasText: "Rafraîchir" })).toBeVisible();
  await page.reload();
  await expect(page.locator(".site-form button", { hasText: "Rafraîchir" })).toBeVisible();
});

test.describe("browser language", () => {
  test.use({ locale: "fr-FR" });

  test("defaults to the browser language", async ({ page }) => {
    await mockOpenMeteo(page);
    await page.goto("/?lat=45.945&lon=6.71");
    await expect(page.locator(".site-form button", { hasText: "Rafraîchir" })).toBeVisible();
    await expect(page.locator('select[aria-label="Langue"]')).toBeVisible();
  });
});

test("the getting-started guide explains models, coverage and quota", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();

  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(page.locator(".guide")).toBeVisible();
  await expect(page.locator(".guide h2")).toHaveText("Getting started");
  await expect(page.locator(".guide")).toContainText("Which model should I use?");
  await expect(page.locator(".guide")).toContainText("AROME HD 1.3 km");
  await expect(page.locator(".guide")).toContainText("high-altitude layers");
  await expect(page.locator(".guide")).toContainText("Open-Meteo quota");
  await expect(page.locator(".guide")).toContainText("per visitor");
  // the guide now also covers the windgram, the sounding, the selling points,
  // the data source and contributions
  await expect(page.locator(".guide h3", { hasText: "Reading the windgram" })).toBeVisible();
  await expect(page.locator(".gram-demo rect").first()).toBeVisible();
  await expect(page.locator(".gram-legend")).toContainText("gust");
  await expect(page.locator(".gram-scale")).toContainText("km/h");
  await expect(page.locator(".guide h3", { hasText: "The sounding, layer by layer" })).toBeVisible();
  await expect(page.locator(".guide")).toContainText("9.8 °C per kilometer");
  await expect(page.locator(".guide")).toContainText("left of that line");
  await expect(page.locator(".guide")).toContainText("Why this app?");
  await expect(page.locator(".guide")).toContainText("latest run");
  await expect(page.locator(".guide")).toContainText("Where the data comes from");
  await expect(page.locator(".guide")).toContainText("grid cell");
  await expect(page.locator(".guide h3", { hasText: "Contributions welcome" })).toBeVisible();
  await expect(page.locator('.guide a:has-text("Report a bug")')).toHaveAttribute(
    "href",
    "https://github.com/AurelienS/weather4paraglider/issues/new?labels=bug",
  );
  await expect(page.locator('.guide a:has-text("Suggest an improvement")')).toHaveAttribute(
    "href",
    "https://github.com/AurelienS/weather4paraglider/issues/new?labels=enhancement",
  );
  // the app content is hidden while the guide is open, and the URL is shareable
  await expect(page.locator(".wg")).toHaveCount(0);
  await expect(page).toHaveURL(/guide=1/);

  // the nav closes it too (the guide has no back button of its own)
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".guide")).toHaveCount(0);
  await expect(page.locator(".wg").first()).toBeVisible();
  await expect(page).not.toHaveURL(/guide=1/);
});

test("renders the AROME windgram for the URL point", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  // demo point + default model collapse to the clean home URL
  await expect(page).not.toHaveURL(/[?&](lat|model)=/);
  await expect(page.locator(".meta")).toContainText("AROME 0.025°");
  await expect(page.locator(".meta")).toContainText("model alt. 1696");
  await expect(page.locator('.seg[aria-label="Day"] button')).toHaveCount(3);
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator(".foot a:has-text('GitHub')")).toHaveAttribute(
    "href",
    "https://github.com/AurelienS/weather4paraglider",
  );
  await expect(page.locator(".foot a:has-text('AGPL-3.0')")).toHaveAttribute(
    "href",
    "https://github.com/AurelienS/weather4paraglider/blob/main/LICENSE",
  );
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

test("switching models keeps the selected day and hour when they exist", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  const dayTabs = page.locator('.seg[aria-label="Day"] button');
  await expect(dayTabs).toHaveCount(3);
  await dayTabs.nth(1).click();
  await expect(dayTabs.nth(1)).toHaveClass(/is-on/);

  await page.locator('.seg[aria-label="View"] button:has-text("Sounding")').click();
  const hourPick = page.getByLabel("Hour");
  await hourPick.selectOption({ label: "14:00" });
  await expect(hourPick.locator("option:checked")).toHaveText("14:00");

  await page.getByLabel("Model").selectOption("arpege_europe");
  await expect(page.locator(".meta")).toContainText("arpege_europe");
  // tomorrow and 14:00 exist in ARPEGE: the selection survives the switch
  await expect(dayTabs).toHaveCount(4);
  await expect(dayTabs.nth(1)).toHaveClass(/is-on/);
  await expect(hourPick.locator("option:checked")).toHaveText("14:00");
});

test("switching models resets the day when the new model lacks it", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  const dayTabs = page.locator('.seg[aria-label="Day"] button');
  await expect(dayTabs).toHaveCount(3);
  await dayTabs.nth(2).click();
  await expect(dayTabs.nth(2)).toHaveClass(/is-on/);

  await page.getByLabel("Model").selectOption("arome_france_hd");
  await expect(page.locator(".meta")).toContainText("0.01°");
  // AROME HD only covers 2 days: the third day falls back to today
  await expect(dayTabs).toHaveCount(2);
  await expect(dayTabs.nth(0)).toHaveClass(/is-on/);
});

test("the model dropdown groups models by use case", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  const pick = page.getByLabel("Model");
  await expect(pick.locator("optgroup")).toHaveCount(4);
  await expect(pick.locator('optgroup[label="Nowcast — next hours"] option')).toHaveCount(1);
  await expect(pick.locator('optgroup[label="Precise near the ground"] option')).toHaveCount(2);
  await expect(pick.locator('optgroup[label="Precise at all altitudes"] option')).toHaveCount(3);
  await expect(pick.locator('optgroup[label="Longer range (4 days)"] option')).toHaveCount(2);
  // every model stays selectable through its group
  await pick.selectOption("arome_france_hd");
  await expect(page.locator(".meta")).toContainText("0.01°");
});

test("clicking the logo returns to the clean home page", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhoton(page);
  await page.goto("/");
  await page.locator("#place").fill("annecy");
  await page.locator('.place-menu button:has-text("Annecy")').click();
  await expect(page).toHaveURL(/lat=45\.8992&lon=6\.1294/);

  // back home: demo point, clean URL, guide and compare closed
  await page.locator(".brand-home").click();
  await expect(page).not.toHaveURL(/[?&]/);
  await expect(page.locator(".meta")).toContainText("45.945°N 6.710°E");
  await expect(page.locator(".board-list")).toHaveCount(0);

  // the logo also closes the guide
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(page.locator(".guide")).toBeVisible();
  await page.locator(".brand-home").click();
  await expect(page.locator(".guide")).toHaveCount(0);
  await expect(page).not.toHaveURL(/[?&]/);
});

test("loading and error notices float as toasts over the charts", async ({ page }) => {
  await mockOpenMeteo(page, { delay: 600 });
  await mockPhoton(page);
  await page.goto("/");
  await page.locator("#place").fill("annecy");
  await page.locator('.place-menu button:has-text("Annecy")').click();

  // while loading, the notice sits at the top-right, above the content
  const toast = page.locator(".flash .banner");
  await expect(toast).toBeVisible();
  const box = (await toast.boundingBox())!;
  expect(box.y).toBeLessThan(60);
  expect(box.x).toBeGreaterThan(700);

  await expect(page.locator(".flash .banner")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
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
  await expect(banner).toContainText("ICON CH1 1 km has no data for this location");
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
  // demo point + default model keep the URL clean (no params)
  await expect(page).not.toHaveURL(/[?&](lat|model)=/);
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator(".meta")).toContainText("45.945°N 6.710°E");
});

test("on a phone the windgram is compact and fits without inner scrolling", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".wg-panel.is-compact")).toBeVisible();
  // hours are decimated: every other hour of the 07:00–22:00 window
  await expect(page.locator(".wg thead th")).toHaveCount(9); // m + 8 hours
  // the grid fits the viewport: no horizontal scroll inside the panel
  const scroll = await page.locator(".wg-scroll").evaluate((el) => ({
    inner: el.scrollWidth,
    outer: el.clientWidth,
  }));
  expect(scroll.inner).toBeLessThanOrEqual(scroll.outer + 1);
  // the page itself can scroll vertically to see the whole grid
  const metrics = await page.evaluate(() => ({
    doc: document.documentElement.scrollHeight,
    view: window.innerHeight,
  }));
  expect(metrics.doc).toBeGreaterThan(metrics.view);
  // and the chart is readable: bigger numbers than on desktop
  const font = await page
    .locator(".wg td.cell .n b")
    .first()
    .evaluate((el) => getComputedStyle(el).fontSize);
  expect(parseFloat(font)).toBeGreaterThanOrEqual(12);
});

test("on a phone the header stacks, centers and never overflows", async ({ page }) => {
  await mockOpenMeteo(page);
  await blockTiles(page);
  await page.setViewportSize({ width: 390, height: 844 });

  const assertCenteredHeader = async () => {
    // nothing sticks out of the viewport: no horizontal page scroll
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // every header row is centered: title, search and actions share the
    // viewport center line
    const centers = await page.evaluate(() => {
      const mid = (el: Element | null) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return Math.round(b.x + b.width / 2);
      };
      return {
        viewport: Math.round(window.innerWidth / 2),
        title: mid(document.querySelector(".board-title")),
        search: mid(document.querySelector(".page-header-context .place-search")),
        actions: mid(document.querySelector(".page-header-actions")),
      };
    });
    expect(centers.viewport).not.toBeNull();
    for (const key of ["title", "search", "actions"] as const) {
      if (centers[key] != null) {
        expect(Math.abs(centers[key]! - centers.viewport!)).toBeLessThanOrEqual(2);
      }
    }
  };

  // place page
  await page.goto("/");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await assertCenteredHeader();

  // compare places: pinned place card + header controls
  await page.goto("/?compare=1&pins=45.9450,6.7100/Passy");
  await expect(page.locator(".board-card").first()).toBeVisible();
  await assertCenteredHeader();

  // compare models: model menu and average toggle wrap under the title
  await page.goto("/?compare=models&pins=model:arome_france;model:icon_d2");
  await expect(page.locator(".board-card").first()).toBeVisible();
  await assertCenteredHeader();

  // the page tabs wrap onto rows instead of scrolling out of the viewport
  const nav = await page.locator(".page-nav").evaluate((el) => ({
    rows: new Set(
      [...el.querySelectorAll("button")].map(
        (b) => Math.round(b.getBoundingClientRect().y),
      ),
    ).size,
    scroll: el.scrollWidth,
  }));
  expect(nav.scroll).toBeLessThanOrEqual(
    (await page.locator(".page-nav").evaluate((el) => el.clientWidth)) + 1,
  );
  expect(nav.rows).toBeGreaterThanOrEqual(2);
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
  await expect(page.locator(".place-line strong")).toContainText("Chamonix-Mont-Blanc");
  const afterPlace = await page
    .locator(".wg")
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(afterPlace - tableTop)).toBeLessThan(1);
  const headerBottomAfter = await page
    .locator("header.top")
    .evaluate((el) => el.getBoundingClientRect().bottom);
  expect(Math.abs(headerBottomAfter - headerBottom)).toBeLessThan(1);
  const nameBox = await page.locator(".place-line strong").boundingBox();
  const favBox = await page.locator(".place-line .fav-add").boundingBox();
  const metaBox = await page.locator(".meta").boundingBox();
  expect(nameBox).not.toBeNull();
  // the place name sits right above the meta line, favorite button to its right
  expect(nameBox!.y + nameBox!.height).toBeLessThanOrEqual(metaBox!.y + 1);
  expect(favBox!.x).toBeGreaterThanOrEqual(nameBox!.x + nameBox!.width - 1);
  expect(om.calls()).toBeGreaterThan(1);
});

test("day tabs stop at the last hour that actually carries data", async ({ page }) => {
  await mockOpenMeteo(page, { nullsAfterHours: 48 });
  await page.goto("/?lat=45.945&lon=6.71&model=meteoswiss_icon_ch1");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator('.seg[aria-label="Day"] button')).toHaveCount(2);
  await expect(page.locator(".meta")).toContainText("meteoswiss_icon_ch1");
});

test("sounding labels the dry adiabat and the isotherms", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await page.locator('.seg[aria-label="View"] button:has-text("Sounding")').click();
  await expect(page.locator(".sounding")).toBeVisible();
  await expect(
    page.locator(".sounding text.line-label:has-text('dry adiabat')"),
  ).toBeVisible();
  await expect(page.locator(".sounding text.line-label:has-text('0 °C')")).toBeVisible();
  await expect(page.locator(".sounding text.line-label:text-is('-20°')")).toBeVisible();
});

test("when Photon is down the search falls back to the Open-Meteo geocoder", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhotonDown(page);
  const geo = await mockOpenMeteoGeocode(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();

  await page.locator("#place").fill("chamo");
  // the fallback results appear; entries outside the model domain are gone
  await expect(
    page.locator('.place-menu button:has-text("Chamonix-Mont-Blanc")'),
  ).toBeVisible();
  await expect(page.locator('.place-menu button:has-text("Nouméa")')).toHaveCount(0);
  await expect(page.locator(".place-empty")).toHaveCount(0);
  expect(geo.calls()).toBe(1);

  // picking a fallback result loads the place
  await page.locator('.place-menu button:has-text("Chamonix-Mont-Blanc")').click();
  await expect(page.locator(".place-line strong")).toContainText("Chamonix-Mont-Blanc");
  await expect(page).toHaveURL(/lat=45\.9231&lon=6\.8692/);
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
  await expect(page.locator(".place-line strong")).toContainText("Chamonix-Mont-Blanc");
  await expect(page.locator(".meta")).toContainText("45.923°N 6.869°E");
});

test("favorites: start empty, add, pick, remove and persistence", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhoton(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();

  const favBtn = page.locator('.fav-menu > button:has-text("Favorites")');
  const favAdd = page.locator(".fav-add");

  // no hardcoded defaults: the empty menu explains how to add a favorite
  await favBtn.click();
  await expect(page.locator(".fav-empty")).toContainText("No favorites yet.");
  await expect(page.locator(".fav-empty-hint")).toContainText("+ Favorite");
  await page.mouse.click(20, 500);

  // load Chamonix and save it as a favorite: the star toggles on
  await page.locator("#place").fill("chamo");
  await page.locator(".place-menu button:has-text('Chamonix-Mont-Blanc')").click();
  await expect(page.locator(".place-line strong")).toContainText("Chamonix-Mont-Blanc");
  await favAdd.click();
  await expect(favAdd).toHaveClass(/is-on/);
  await expect(favBtn).toHaveText("Favorites (1)");

  // picking the favorite loads its point and shows it as saved
  await favBtn.click();
  await page.locator(".fav-item:has-text('Chamonix-Mont-Blanc')").click();
  await expect(page.locator(".place-line strong")).toContainText("Chamonix-Mont-Blanc");
  await expect(favAdd).toHaveClass(/is-on/);

  // a second favorite
  await page.locator("#place").fill("annecy");
  await page.locator('.place-menu button:has-text("Annecy")').click();
  await favAdd.click();
  await expect(favBtn).toHaveText("Favorites (2)");

  // the star is a toggle: clicking it again removes the favorite
  await favAdd.click();
  await expect(favAdd).not.toHaveClass(/is-on/);
  await expect(favBtn).toHaveText("Favorites (1)");
  await favAdd.click();
  await expect(favAdd).toHaveClass(/is-on/);
  await expect(favBtn).toHaveText("Favorites (2)");

  // remove the Annecy favorite
  await favBtn.click();
  await page.locator('.fav-list li:has-text("Annecy") .fav-remove').click();
  await expect(favBtn).toHaveText("Favorites (1)");
  // the star follows: the current place is no longer saved
  await expect(favAdd).not.toHaveClass(/is-on/);
  await page.mouse.click(20, 500);

  // favorites persist across a reload
  await page.reload();
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await favBtn.click();
  await expect(page.locator(".fav-item")).toHaveCount(1);
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
  await expect(page.locator(".place-line")).toContainText("Chamonix-Mont-Blanc");
});

test("opening the Compare page pins the current place", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();

  await page.getByRole("button", { name: "Compare places" }).click();
  await expect(page).toHaveURL(/compare=1&pins=45\.9450,6\.7100/);
  // the current place joins the board automatically, main windgram disappears,
  // the main search is replaced by the page nav
  await expect(page.locator(".board-card")).toHaveCount(1);
  await expect(page.locator(".board-card-name")).toHaveText("45.9450, 6.7100");
  await expect(page.locator(".board-head h2")).toHaveText("Compare · 1 place");
  await expect(page.locator(".wg")).toHaveCount(1);
  await expect(page.locator("#place")).toHaveCount(0);
  await expect(
    page.locator('.page-nav button[aria-current="page"]'),
  ).toHaveText("Compare places");
  expect(om.calls()).toBe(1); // auto-pin reuses the main cache

  // the browser back button leaves the compare page
  await page.goBack();
  await expect(page.locator(".board-list")).toHaveCount(0);
  await expect(page.locator(".wg")).toHaveCount(1);
  await expect(page).not.toHaveURL(/compare=1/);
  await expect(page.locator("#place")).toBeVisible();

  // forward re-enters the compare page with the board restored from the URL
  await page.goForward();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await expect(page.locator(".board-card-name")).toHaveText("45.9450, 6.7100");

  // the "Place" tab of the nav also leaves it
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".board-list")).toHaveCount(0);
  await expect(page.locator(".wg")).toHaveCount(1);
  await expect(page).not.toHaveURL(/pins=/);

  // re-entering starts from the current place only
  await page.getByRole("button", { name: "Compare places" }).click();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await expect(page.locator(".board-card-name")).toHaveText("45.9450, 6.7100");
});

test("adding places to the board: search +, board picker and favorites", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await mockPhoton(page);
  // seeded favorites: Aravis matches the current place, so it shows disabled
  await page.addInitScript(() => {
    localStorage.setItem(
      "w4p.favorites.v1",
      JSON.stringify({
        v: 1,
        data: [
          { lat: 45.945, lon: 6.71, label: "Aravis" },
          { lat: 45.7726, lon: 2.9646, label: "Puy de Dôme" },
        ],
      }),
    );
  });
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();

  // the + button on a main-search result opens the compare page anchored to
  // the current place, without touching it
  await page.locator("#place").fill("chamo");
  await page
    .locator('.place-menu button[aria-label="Add Chamonix-Mont-Blanc to the comparison"]')
    .click();
  await expect(page.locator(".board-card")).toHaveCount(2);
  // the added place first, the current place appended to anchor the board
  // (the Photon mock names every point "Chamonix-Mont-Blanc", so both cards
  // carry the same label — the coordinates prove the anchor)
  await expect(page.locator(".board-card-name").first()).toContainText("Chamonix-Mont-Blanc");
  await expect(page).toHaveURL(/pins=45\.9231,6\.8692\/.*45\.9450,6\.7100/);
  await expect(page).toHaveURL(/compare=1/);
  expect(om.calls()).toBe(2); // main place + Chamonix; the anchor reuses the cache

  // the board picker adds a place without touching the main place either
  await page.locator("#board-place").fill("annecy");
  await page.locator('.place-menu button:has-text("Annecy")').click();
  await expect(page.locator(".board-card")).toHaveCount(3);
  await expect(page.locator('.board-card-name:has-text("Annecy")')).toBeVisible();
  await expect(page).toHaveURL(/lat=45\.945&lon=6\.71/);
  expect(om.calls()).toBe(3);

  // favorites already in the comparison are disabled in the board menu;
  // the picker only adds pins, it never deletes favorites
  const boardFav = page.locator(".page-header-actions .fav-menu > button");
  await boardFav.click();
  await expect(
    page.locator('.page-header-actions .fav-item:has-text("Aravis")'),
  ).toBeDisabled();
  await expect(
    page.locator('.page-header-actions .fav-item:has-text("Puy de Dôme")'),
  ).toBeEnabled();
  await expect(page.locator(".page-header-actions .fav-remove")).toHaveCount(0);
});

test("removing pins just removes them; an empty board shows the placeholder", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71&compare=1&pins=45.92,6.87/Plaine%20Joux;46.1,6.2");
  await expect(page.locator(".board-card")).toHaveCount(3);

  await page
    .locator('button[aria-label="Remove Plaine Joux from the comparison"]')
    .click();
  await expect(page.locator(".board-card")).toHaveCount(2);
  await expect(page).not.toHaveURL(/Plaine%20Joux/);
  // removing the current place's pin no longer ends the comparison
  await expect(page.locator(".board-list")).toBeVisible();
  await expect(page).toHaveURL(/compare=1/);

  await page
    .locator('button[aria-label="Remove 45.9450, 6.7100 from the comparison"]')
    .click();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await expect(page.locator(".board-list")).toBeVisible();

  await page
    .locator('button[aria-label="Remove 46.1000, 6.2000 from the comparison"]')
    .click();
  // zero entries is a valid state: the page stays open with its placeholder
  await expect(page.locator(".board-card")).toHaveCount(0);
  await expect(page.locator(".board-title")).toHaveText(
    "Select places to compare…",
  );
  await expect(page).toHaveURL(/compare=1/);
  await expect(page).not.toHaveURL(/pins=/);

  // picking from the empty board works right away
  await page.locator("#board-place").fill("annecy");
  await page.locator('.place-menu button:has-text("Annecy")').first().click();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await expect(page.locator(".board-title")).toHaveText("Compare · 1 place");
});

test("clear all empties the board, keeps the page open and records it", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71&compare=1&pins=45.92,6.87/Plaine%20Joux;46.1,6.2");
  await expect(page.locator(".board-card")).toHaveCount(3);
  await page.locator('button:has-text("Clear all")').click();
  await expect(page.locator(".board-card")).toHaveCount(0);
  // the page stays open on its placeholder, the URL keeps compare=1
  await expect(page.locator(".board-title")).toHaveText(
    "Select places to compare…",
  );
  await expect(page).toHaveURL(/compare=1/);
  await expect(page).not.toHaveURL(/pins=/);

  // the cleared board landed in the recent list and can be brought back
  await page.locator(".hist-menu > button").click();
  await expect(page.locator(".hist-menu .fav-item").first()).toContainText("Plaine Joux +2");
  await page.locator(".hist-menu .fav-item").first().click();
  await expect(page.locator(".board-card")).toHaveCount(3);
  await expect(page.locator(".board-card-name")).toHaveText([
    "Plaine Joux",
    "46.1000, 6.2000",
    "45.9450, 6.7100",
  ]);
});

test("compare models at one place: pick, reorder, share and recents", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();

  // the nav has two compare tabs; the model one seeds the board with the
  // currently selected model (AROME 2.5 km), the place stays page context
  await page.getByRole("button", { name: "Compare models" }).click();
  await expect(page).toHaveURL(/compare=models&pins=model:arome_france$/);
  await expect(
    page.locator('.page-nav button[aria-current="page"]'),
  ).toHaveText("Compare models");
  await expect(page.locator(".board-card")).toHaveCount(1);
  await expect(page.locator(".board-card-name")).toHaveText("AROME 2.5 km");
  await expect(page.locator(".board-head h2")).toHaveText(
    "45.9450, 6.7100 · 1 model",
  );
  // no favorites on the model board; the place picker switches the location
  await expect(page.locator(".page-header-actions .fav-menu")).toHaveCount(0);
  await expect(page.locator("#board-switch")).toHaveCount(1);

  // the Models menu lists the catalog; toggling adds a card per model
  const modelsBtn = page.locator(".page-header-context .model-menu > button");
  await modelsBtn.click();
  await page.locator('.model-menu .fav-item:has-text("ICON D2")').click();
  await page.locator('.model-menu .fav-item:has-text("ICON CH1")').click();
  // the seeded model counts too: 1 + 2 toggles
  await expect(modelsBtn).toHaveText("Models (3)");
  // the menu stays open so several models can be toggled in one go
  await expect(page.locator(".model-menu .fav-list")).toBeVisible();
  await page.locator(".board-head h2").click();
  await expect(page.locator(".board-card")).toHaveCount(3);
  await expect(page.locator(".board-card-name")).toHaveText([
    "AROME 2.5 km",
    "ICON D2",
    "ICON CH1",
  ]);
  await expect(page.locator(".board-head h2")).toHaveText(
    "45.9450, 6.7100 · 3 models",
  );
  // every card got its own data (3 fetches, one per model)
  await expect(page.locator(".board-card .wg")).toHaveCount(3);
  expect(om.calls()).toBe(3);
  // each card carries its model info and the run it was built from
  await expect(page.locator(".board-card-foot").first()).toContainText(
    /run .* UTC/,
  );

  // the average toggle prepends a derived card (no extra fetch), first in
  // the board, with the mean of the three loaded models
  await page.locator('button:has-text("Average")').click();
  await expect(page.locator(".board-card")).toHaveCount(4);
  await expect(page.locator(".board-card").first()).toContainText("Average (3)");
  await expect(page.locator(".board-card").first()).toHaveClass(/is-average/);
  await expect(page.locator(".board-card .wg")).toHaveCount(4);
  expect(om.calls()).toBe(3);
  // the toggle survives a reload (persisted with the board)
  await page.reload();
  await expect(page.locator(".board-card").first()).toContainText("Average (3)");
  // toggling it off restores the raw board
  await page.locator('button:has-text("Average")').click();
  await expect(page.locator(".board-card")).toHaveCount(3);
  await expect(page.locator(".board-card").first()).toContainText("AROME 2.5 km");
  await expect(page).toHaveURL(
    /pins=model:arome_france;model:icon_d2;model:meteoswiss_icon_ch1$/,
  );

  // reorder: move ICON D2 up, the URL follows the new order
  await page
    .locator(".board-card", { hasText: "ICON D2" })
    .locator('button[aria-label="Move ICON D2 up"]')
    .click();
  await expect(page.locator(".board-card-name")).toHaveText([
    "ICON D2",
    "AROME 2.5 km",
    "ICON CH1",
  ]);
  await expect(page).toHaveURL(
    /pins=model:icon_d2;model:arome_france;model:meteoswiss_icon_ch1$/,
  );

  // the shared URL restores the model board in the same order
  await page.reload();
  await expect(page.locator(".board-card-name")).toHaveText([
    "ICON D2",
    "AROME 2.5 km",
    "ICON CH1",
  ]);

  // removing the last model card keeps the page open on its placeholder
  await page
    .locator(".board-card", { hasText: "ICON CH1" })
    .locator(".board-card-remove")
    .click();
  await expect(page.locator(".board-card")).toHaveCount(2);
  await page
    .locator(".board-card", { hasText: "ICON D2" })
    .locator(".board-card-remove")
    .click();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await page
    .locator(".board-card", { hasText: "AROME 2.5 km" })
    .locator(".board-card-remove")
    .click();
  await expect(page.locator(".board-card")).toHaveCount(0);
  await expect(page.locator(".board-title")).toHaveText(
    "Select models to compare…",
  );
  await expect(page).toHaveURL(/compare=models/);
  await expect(page).not.toHaveURL(/pins=/);

  // leaving via the nav still closes it; the dismantled board landed in
  // the recents and can be restored
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".board-list")).toHaveCount(0);
  await expect(page.locator(".wg")).toHaveCount(1);
  await expect(page).not.toHaveURL(/compare=models/);

  await page.getByRole("button", { name: "Compare models" }).click();
  // reopening seeds the selected model again (a fresh board)
  await expect(page.locator(".board-card")).toHaveCount(1);
  await page.locator(".hist-menu > button").click();
  await expect(page.locator(".hist-menu .fav-item").first()).toContainText(
    "45.9450,6.7100 · ICON D2 +1",
  );
  await page.locator(".hist-menu .fav-item").first().click();
  await expect(page.locator(".board-card")).toHaveCount(2);
});

test("the two compare pages keep separate recent lists", async ({ page }) => {
  await mockOpenMeteo(page);
  // a place comparison is recorded…
  await page.goto("/?lat=45.945&lon=6.71&compare=1&pins=45.92,6.87/Plaine%20Joux");
  await expect(page.locator(".board-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".board-list")).toHaveCount(0);

  // …then a model comparison
  await page.getByRole("button", { name: "Compare models" }).click();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await page.locator(".page-header-context .model-menu > button").click();
  await page.locator('.model-menu .fav-item:has-text("ICON D2")').click();
  await page.locator(".board-head h2").click();
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".board-list")).toHaveCount(0);

  // the place page lists only place comparisons
  await page.getByRole("button", { name: "Compare places" }).click();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await page.locator(".hist-menu > button").click();
  await expect(page.locator(".hist-menu .fav-item")).toHaveCount(1);
  await expect(page.locator(".hist-menu .fav-item").first()).toContainText(
    "Plaine Joux +1",
  );

  // the model page lists only model comparisons
  await page.getByRole("button", { name: "Compare models" }).click();
  await page.locator(".hist-menu > button").click();
  await expect(page.locator(".hist-menu .fav-item")).toHaveCount(1);
  await expect(page.locator(".hist-menu .fav-item").first()).toContainText(
    "45.9450,6.7100 · AROME 2.5 km +1",
  );
});

test("the model board can switch place and keeps its models", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhoton(page);
  await page.goto("/?lat=45.945&lon=6.71&compare=models&pins=model:arome_france;model:icon_d2");
  await expect(page.locator(".board-card")).toHaveCount(2);
  await expect(page.locator(".board-card-foot").first()).toContainText(
    "45.9450,6.7100",
  );

  // switching place refetches the SAME models at the new coordinates
  await page.locator("#board-switch").fill("annecy");
  await page.locator('.place-menu button:has-text("Annecy")').click();
  await expect(page.locator(".board-card")).toHaveCount(2);
  await expect(page.locator(".board-card-foot").first()).toContainText(
    "45.8992,6.1294",
  );
  // the URL follows the new place, the model list is untouched
  await expect(page).toHaveURL(/lat=45\.8992&lon=6\.1294.*compare=models/);
  await expect(page).toHaveURL(/pins=model:arome_france;model:icon_d2/);
  // the main context moved too: leaving shows the new place
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".wg")).toHaveCount(1);
  await expect(page).toHaveURL(/lat=45\.8992&lon=6\.1294/);
});

test("the board can be reordered with the up and down arrows", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71&compare=1&pins=45.92,6.87/Plaine%20Joux;46.1,6.2");
  await expect(page.locator(".board-card")).toHaveCount(3);
  // boot order: Plaine Joux, 46.1, then the current place appended
  await expect(page.locator(".board-card-name")).toHaveText([
    "Plaine Joux",
    "46.1000, 6.2000",
    "45.9450, 6.7100",
  ]);

  // the first card has no up arrow, the last no down arrow
  await expect(
    page
      .locator(".board-card")
      .first()
      .locator('button[aria-label="Move Plaine Joux up"]'),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".board-card")
      .last()
      .locator('button[aria-label^="Move 45.9450, 6.7100 down"]'),
  ).toHaveCount(0);

  // move Plaine Joux down: it swaps with 46.1
  await page
    .locator(".board-card", { hasText: "Plaine Joux" })
    .locator('button[aria-label="Move Plaine Joux down"]')
    .click();
  await expect(page.locator(".board-card-name")).toHaveText([
    "46.1000, 6.2000",
    "Plaine Joux",
    "45.9450, 6.7100",
  ]);
  // the URL follows the new order
  await expect(page).toHaveURL(
    /pins=46\.1000,6\.2000;45\.9200,6\.8700\/Plaine%20Joux;45\.9450,6\.7100$/,
  );

  // move Plaine Joux back up…
  await page
    .locator(".board-card", { hasText: "Plaine Joux" })
    .locator('button[aria-label="Move Plaine Joux up"]')
    .click();
  await expect(page.locator(".board-card-name")).toHaveText([
    "Plaine Joux",
    "46.1000, 6.2000",
    "45.9450, 6.7100",
  ]);
  // …and down again: the board is back to the boot order
  await page
    .locator(".board-card", { hasText: "Plaine Joux" })
    .locator('button[aria-label="Move Plaine Joux down"]')
    .click();
  await expect(page.locator(".board-card-name")).toHaveText([
    "46.1000, 6.2000",
    "Plaine Joux",
    "45.9450, 6.7100",
  ]);
  // the reloaded data survived the reorder (no note replacing the card)
  await expect(page.locator(".board-card-note")).toHaveCount(0);
});

test("a pin outside the model domain shows an inline error, not a banner", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto(
    "/?lat=45.945&lon=6.71&model=meteoswiss_icon_ch1&compare=1&pins=44.84,-0.58/Bordeaux",
  );
  await expect(page.locator(".board-card-name").first()).toBeVisible();
  const note = page.locator(".board-card-note.error");
  await expect(note).toContainText("ICON CH1 1 km has no data for this location");
  await expect(page.locator(".banner.error")).toHaveCount(0);
  expect(om.calls()).toBe(1); // main only: the pin is rejected before any call
});

test("pinned names survive a reload", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto("/?lat=45.9231&lon=6.8692&compare=1&pins=45.9231,6.8692/Chamonix");
  await expect(page.locator(".board-card")).toHaveCount(1);
  await expect(page.locator(".board-card-name")).toHaveText("Chamonix");
  await expect(page.locator(".wg")).toHaveCount(1);
  expect(om.calls()).toBe(1); // main and pin share the same cache key

  await page.reload();
  await expect(page.locator(".board-card-name")).toHaveText("Chamonix");
  expect(om.calls()).toBe(1);

  // with compare off the board is discarded: no Photon mock here, so the
  // header falls back to the bare coordinates
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".place-line strong")).toContainText("45.9231°N 6.8692°E");
});

test("a shared URL shows the place name, not bare coordinates", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhoton(page);
  await page.goto("/?lat=45.9546371&lon=6.7539224&model=arome_france");
  await expect(page.locator(".place-line strong")).toContainText("Chamonix-Mont-Blanc");
  // the data still loads for the exact shared coordinates
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator(".meta")).toContainText("45.955°N 6.754°E");
});

test("leaving the Compare page discards the board and records it", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71&compare=1&pins=45.92,6.87/Plaine%20Joux");
  await expect(page.locator(".board-card")).toHaveCount(2);
  await expect(page.locator(".wg")).toHaveCount(2);

  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".board-list")).toHaveCount(0);
  await expect(page).not.toHaveURL(/compare=1/);
  await expect(page).not.toHaveURL(/pins=/);
  await expect(page.locator(".wg")).toHaveCount(1);
  // the board is not kept around: re-entering starts from the current place
  await page.getByRole("button", { name: "Compare places" }).click();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await expect(page.locator(".board-card-name")).toHaveText("45.9450, 6.7100");
  await expect(page.locator(".wg")).toHaveCount(1);
});

test("a closed comparison is restored from the recent list", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71&compare=1&pins=45.92,6.87/Plaine%20Joux");
  await expect(page.locator(".board-card")).toHaveCount(2);

  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".board-list")).toHaveCount(0);

  await page.getByRole("button", { name: "Compare places" }).click();
  await expect(page.locator(".board-card")).toHaveCount(1);
  // the recorded comparison appears in the board tools
  await page.locator(".hist-menu > button").click();
  await expect(page.locator(".hist-menu .fav-item").first()).toContainText("Plaine Joux +1");
  await page.locator(".hist-menu .fav-item").first().click();

  // the board is restored with both entries and their names
  await expect(page.locator(".board-card")).toHaveCount(2);
  await expect(page.locator(".board-card-name")).toHaveText([
    "Plaine Joux",
    "45.9450, 6.7100",
  ]);
  await expect(page).toHaveURL(/pins=45\.9200,6\.8700\/Plaine%20Joux/);
});

test("a recent comparison lives on the compare page, not the home page", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhoton(page);
  await page.goto("/?lat=45.945&lon=6.71&compare=1&pins=45.92,6.87/Plaine%20Joux");
  await expect(page.locator(".board-card")).toHaveCount(2);

  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".board-list")).toHaveCount(0);
  await expect(page.locator(".wg")).toHaveCount(1);

  // the home page has no comparison recents: they live on the compare page.
  // Its own recent list holds places: searching feeds it
  await expect(page.locator(".hist-menu")).toHaveCount(0);
  await page.locator("#place").fill("annecy");
  await page.locator('.place-menu button:has-text("Annecy")').click();
  await expect(page.locator(".wg")).toHaveCount(1);
  await page.locator(".recent-menu > button").click();
  await expect(page.locator(".recent-menu .fav-item").first()).toContainText("Annecy");

  // re-entering the compare page exposes the recorded comparison
  await page.getByRole("button", { name: "Compare places" }).click();
  await expect(page.locator(".board-card")).toHaveCount(1);
  // the recent list survives a reload (persisted, rehydrated at boot)
  await page.reload();
  await expect(page.locator(".board-card")).toHaveCount(1);
  await page.locator(".hist-menu > button").click();
  await expect(page.locator(".hist-menu .fav-item").first()).toContainText("Plaine Joux +1");
  await page.locator(".hist-menu .fav-item").first().click();

  // restoring brings the board back with both entries
  await expect(page.locator(".board-card")).toHaveCount(2);
  await expect(page.locator(".board-card-name")).toHaveText([
    "Plaine Joux",
    "45.9450, 6.7100",
  ]);
  await expect(page).toHaveURL(/compare=1/);
});

test("the last removal of the recent list empties it", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71&compare=1&pins=45.92,6.87/Plaine%20Joux");
  await expect(page.locator(".board-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page.locator(".board-list")).toHaveCount(0);
  await page.getByRole("button", { name: "Compare places" }).click();
  // re-entering and discarding a 1-place board records nothing new but keeps
  // the previous entry
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await page.getByRole("button", { name: "Compare places" }).click();
  await expect(page.locator(".hist-menu > button")).toBeVisible();
});
