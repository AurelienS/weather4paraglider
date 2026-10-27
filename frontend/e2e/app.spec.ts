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
  await expect(page.locator(".guide")).toContainText("ICON D2");
  await expect(page.locator(".guide")).toContainText("high-altitude layers");
  await expect(page.locator(".guide")).toContainText("Open-Meteo quota");
  await expect(page.locator(".guide")).toContainText("per visitor");
  // the guide now also covers the windgram, the sounding, the selling points,
  // the data source and contributions
  await expect(page.locator(".guide h3", { hasText: "Reading the windgram" })).toBeVisible();
  await expect(page.locator(".gram-demo rect").first()).toBeVisible();
  await expect(page.locator(".gram-legend")).toContainText("gust");
  await expect(page.locator(".gram-scale")).toContainText("km/h");
  await expect(page.locator(".gram-scale")).toContainText("m/s");
  await expect(page.locator(".guide")).toContainText("violet");
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

function parseRgb(color: string): [number, number, number] {
  const nums = color.match(/[\d.]+/g);
  if (!nums || nums.length < 3) throw new Error(`unparsed color ${color}`);
  const r = Number(nums[0]);
  const g = Number(nums[1]);
  const b = Number(nums[2]);
  return [r, g, b];
}

/** OKLab distance. Same threshold as ARROW_MIN_DISTANCE in src/lib/windgram.ts. */
function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  const linear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const oklab = (rgb: [number, number, number]) => {
    const r = linear(rgb[0]);
    const g = linear(rgb[1]);
    const bl = linear(rgb[2]);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ] as const;
  };
  const [l1, a1, b1] = oklab(a);
  const [l2, a2, b2] = oklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

test("wind arrows stay readable on the thermal background", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell .warrow").first()).toBeVisible();

  const gram = await page.locator(".wg").first().evaluate((root) => {
    const out: { bg: string; ink: string }[] = [];
    for (const cell of root.querySelectorAll("td.cell")) {
      const arrow = cell.querySelector(".warrow");
      if (!arrow) continue;
      const lines = arrow.querySelectorAll("line");
      const ink =
        lines.length >= 2
          ? lines[1]?.getAttribute("stroke")
          : arrow.querySelector("circle")?.getAttribute("fill");
      const bg = getComputedStyle(cell).backgroundColor;
      if (ink) out.push({ bg, ink });
    }
    return out;
  });
  expect(gram.length).toBeGreaterThan(20);
  for (const pair of gram) {
    expect(colorDistance(parseRgb(pair.bg), parseRgb(pair.ink))).toBeGreaterThanOrEqual(0.16);
  }

  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(page.locator(".gram-demo")).toBeVisible();
  const demo = await page.locator(".gram-demo").evaluate((svg) => {
    const out: { bg: string; ink: string }[] = [];
    for (const cell of svg.querySelectorAll("g")) {
      const rect = cell.querySelector(":scope > rect");
      const lines = cell.querySelectorAll(":scope > g > line");
      if (!rect || lines.length < 2) continue;
      const bg = rect.getAttribute("fill");
      const ink = lines[1]?.getAttribute("stroke");
      if (bg && ink) out.push({ bg, ink });
    }
    return out;
  });
  expect(demo.length).toBe(15);
  for (const pair of demo) {
    expect(colorDistance(parseRgb(pair.bg), parseRgb(pair.ink))).toBeGreaterThanOrEqual(0.16);
  }
});

test("renders the AROME windgram for the URL point", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  // demo point + default model collapse to the clean home URL
  await expect(page).not.toHaveURL(/[?&](lat|model)=/);
  await expect(page.locator(".meta span")).toHaveCount(2);
  await expect(page.locator(".meta")).toContainText("model alt. 1696");
  await expect(page.locator(".meta")).toContainText("UTC");
  await expect(page.locator(".meta")).not.toContainText("°N");
  await expect(page.locator(".meta")).not.toContainText("arome_france");
  await expect(page.locator(".model-plate").first()).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".model-ink")).toBeVisible();
  await expect(page.locator(".seg-ink.is-on")).toHaveCount(2);
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

test("the two model plates switch the forecast window and the URL", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator('.seg[aria-label="Day"] button')).toHaveCount(3);

  const plates = page.locator(".model-plate");
  await expect(plates).toHaveCount(2);
  await expect(plates.nth(0)).toHaveAttribute("aria-checked", "true");
  await expect(plates.nth(0)).toContainText("AROME 2.5 km");
  await expect(plates.nth(1)).toContainText("ICON D2");

  await plates.nth(1).click();
  await expect(page).toHaveURL(/model=icon_d2/);
  await expect(page.locator('.seg[aria-label="Day"] button')).toHaveCount(2);
  await expect(plates.nth(1)).toHaveAttribute("aria-checked", "true");

  // switching back to AROME hits the localStorage cache again
  const before = om.calls();
  await plates.nth(0).click();
  await expect(page.locator('.seg[aria-label="Day"] button')).toHaveCount(3);
  await expect(plates.nth(0)).toHaveAttribute("aria-checked", "true");
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
  await expect(page.locator(".time-readout")).toHaveText("08:00");
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Next hour" }).click();
  }
  await expect(page.locator(".time-readout")).toHaveText("14:00");

  await page.locator(".model-plate").nth(1).click();
  await expect(page.locator(".model-plate").nth(1)).toHaveAttribute("aria-checked", "true");
  // tomorrow and 14:00 exist in ICON D2: the selection survives the switch
  await expect(dayTabs).toHaveCount(2);
  await expect(dayTabs.nth(1)).toHaveClass(/is-on/);
  await expect(page.locator(".time-readout")).toHaveText("14:00");
});

test("switching models resets the day when the new model lacks it", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  const dayTabs = page.locator('.seg[aria-label="Day"] button');
  await expect(dayTabs).toHaveCount(3);
  await dayTabs.nth(2).click();
  await expect(dayTabs.nth(2)).toHaveClass(/is-on/);

  await page.locator(".model-plate").nth(1).click();
  await expect(page.locator(".model-plate").nth(1)).toHaveAttribute("aria-checked", "true");
  // ICON D2 covers 2 days: the third day falls back to today
  await expect(dayTabs).toHaveCount(2);
  await expect(dayTabs.nth(0)).toHaveClass(/is-on/);
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
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator(".meta")).toContainText("model alt. 1696");
  await expect(page.locator(".meta")).not.toContainText("°N");
  await expect(page.locator(".model-plate").first()).toHaveAttribute("aria-checked", "true");
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
  await expect(page).toHaveURL(/model=arome_france_15min/);
  await expect(page.locator(".rail-note")).toHaveText("AROME 15 min");
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
  await expect(banner).toContainText("Pick the other model");
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
  await expect(page.locator(".meta")).toContainText("model alt. 1696");
  await expect(page.locator(".meta")).not.toContainText("°N");
});

test("on a phone the windgram is compact and fits without inner scrolling", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".wg-panel.is-compact")).toBeVisible();
  // hours are decimated: every other hour of the 08:00–21:00 window
  await expect(page.locator(".wg thead th")).toHaveCount(8); // m + 7 hours
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

test("on a phone the desk stacks and never overflows", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator(".model-plate")).toHaveCount(2);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const rail = await page.locator(".rail").boundingBox();
  const gram = await page.locator(".wg").boundingBox();
  expect(rail).not.toBeNull();
  expect(gram).not.toBeNull();
  expect(rail!.y).toBeLessThan(gram!.y);
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

test("the thermal tint on the windgram starts at the ground row", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  const sol = page.locator('.wg tbody tr:has(th:text-is("sol 1696"))');
  const midday = sol.locator("td").nth(5);
  const night = sol.locator("td").nth(13);
  await expect(midday).toBeVisible();
  const [middayBg, nightBg] = await Promise.all([
    midday.evaluate((el) => getComputedStyle(el).backgroundColor),
    night.evaluate((el) => getComputedStyle(el).backgroundColor),
  ]);
  const day = parseRgb(middayBg);
  const dusk = parseRgb(nightBg);
  // Midday ground carries a thermal hue. At night the row stays a neutral veil.
  expect(Math.max(...day) - Math.min(...day)).toBeGreaterThan(25);
  expect(Math.abs(dusk[0] - dusk[1])).toBeLessThan(8);
  await midday.hover();
  await expect(page.locator(".wg-cursor-tip")).toContainText("m/s");
  await night.hover();
  await expect(page.locator(".wg-cursor-tip")).not.toContainText("m/s");
});

test("windgram tooltip shows the thermal updraft at midday and not at night", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  const row = page.locator('.wg tbody tr:has(th:text-is("2000"))');
  await expect(row).toBeVisible();
  // 13:00 is the 6th column (hours start at 08:00); 21:00 is the 14th
  await row.locator("td").nth(5).hover();
  await expect(page.locator(".wg-cursor-tip")).toContainText("m/s");
  await row.locator("td").nth(13).hover();
  await expect(page.locator(".wg-cursor-tip")).not.toContainText("m/s");
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
  await expect(page).toHaveURL(/model=meteoswiss_icon_ch1/);
  await expect(page.locator(".rail-note")).toHaveText("ICON CH1");
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

test("the meteogram tab draws the day in one shared plot", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await page.locator('.seg[aria-label="View"] button:has-text("Meteogram")').click();
  await expect(page.locator(".meteo-svg")).toBeVisible();

  // continuous cloud bands (closed soft paths), not per-hour bars
  const clouds = await page.locator("path.meteo-cloud").count();
  expect(clouds).toBeGreaterThanOrEqual(1);
  const d = await page.locator("path.meteo-cloud").first().getAttribute("d");
  expect(d).toContain("Q"); // rounded corners, both ends included
  expect(d).toMatch(/Z$/);

  // the yellow convective-top line rides the real altitude scale
  await expect(page.locator(".meteo-cbl")).toHaveCount(1);

  const meteo = page.locator(".meteo-svg");
  const meteoBox = await meteo.boundingBox();
  expect(meteoBox).not.toBeNull();
  await page.mouse.move(meteoBox!.x + meteoBox!.width * 0.42, meteoBox!.y + meteoBox!.height * 0.45);
  const meteoRead = page.locator(".hover-card strong");
  await expect(meteoRead).toBeVisible();
  await expect(page.locator(".hover-card")).toContainText("°");
  const earlier = await meteoRead.innerText();
  expect(earlier).toMatch(/^\d{2}:\d{2}$/);
  await page.mouse.move(meteoBox!.x + meteoBox!.width * 0.42 + 14, meteoBox!.y + meteoBox!.height * 0.45);
  expect(await meteoRead.innerText()).not.toBe(earlier);

  // the curve names sit in the right margin, never overlapping
  const labels = await page.locator(".meteo-svg .meteo-lbl").evaluateAll((els) =>
    els
      .filter((el) => Number(el.getAttribute("x")) > 600)
      .map((el) => Number(el.getAttribute("y")))
      .sort((a, b) => a - b),
  );
  expect(labels.length).toBeGreaterThanOrEqual(3);
  for (let i = 1; i < labels.length; i++) {
    expect(labels[i]! - labels[i - 1]!).toBeGreaterThanOrEqual(12);
  }
});

test("near-ground-only models show a placeholder instead of a sounding", async ({ page }) => {
  await mockOpenMeteo(page);
  // AROME France HD publishes no isobaric levels: no sounding possible
  await page.goto("/?lat=45.945&lon=6.71&model=arome_france_hd");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await page.locator('.seg[aria-label="View"] button:has-text("Sounding")').click();
  await expect(page.locator(".board-card-note")).toContainText(
    "no isobaric levels",
  );
  await expect(page.locator(".sounding")).toHaveCount(0);
  // the other views keep working for the same model
  await page.locator('.seg[aria-label="View"] button:has-text("Meteogram")').click();
  await expect(page.locator(".meteo-svg")).toBeVisible();
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
  await expect(page.locator(".meta")).toContainText("model alt.");
  await expect(page.locator(".meta")).not.toContainText("°N");
});

test("favorites stay visible: add, pick, remove and persistence", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhoton(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();

  const favAdd = page.locator(".fav-add");
  const favs = page.locator(".rail-fav");

  await expect(favs.locator(".fav-empty")).toContainText("No favorites yet.");
  await expect(favs.locator(".fav-empty-hint")).toContainText("star");

  await page.locator("#place").fill("chamo");
  await page.locator(".place-menu button:has-text('Chamonix-Mont-Blanc')").click();
  await expect(page.locator(".place-line strong")).toContainText("Chamonix-Mont-Blanc");
  await favAdd.click();
  await expect(favAdd).toHaveClass(/is-on/);
  await expect(favs.locator(".rail-place")).toHaveCount(1);
  await expect(favs.locator(".rail-mark")).toBeVisible();

  await favs.locator(".rail-place:has-text('Chamonix-Mont-Blanc')").click();
  await expect(page.locator(".place-line strong")).toContainText("Chamonix-Mont-Blanc");
  await expect(favAdd).toHaveClass(/is-on/);

  await page.locator("#place").fill("annecy");
  await page.locator('.place-menu button:has-text("Annecy")').click();
  await favAdd.click();
  await expect(favs.locator(".rail-place")).toHaveCount(2);

  await favAdd.click();
  await expect(favAdd).not.toHaveClass(/is-on/);
  await expect(favs.locator(".rail-place")).toHaveCount(1);
  await favAdd.click();
  await expect(favAdd).toHaveClass(/is-on/);
  await expect(favs.locator(".rail-place")).toHaveCount(2);

  await favs.locator('.rail-row:has-text("Annecy") .fav-remove').click();
  await expect(favs.locator(".rail-place")).toHaveCount(1);
  await expect(favAdd).not.toHaveClass(/is-on/);

  await page.reload();
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(favs.locator(".rail-place")).toHaveCount(1);
  await expect(favs.locator(".rail-place")).toContainText("Chamonix-Mont-Blanc");
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

test("sounding arrows step through the hours and into the next day", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await page.locator('.seg[aria-label="View"] button:has-text("Sounding")').click();

  const prev = page.getByRole("button", { name: "Previous hour" });
  const next = page.getByRole("button", { name: "Next hour" });
  const readout = page.locator(".time-readout");

  while (await prev.isEnabled()) await prev.click();
  await expect(prev).toBeDisabled();
  await expect(readout).toHaveText("08:00");

  await next.click();
  await expect(readout).toHaveText("09:00");
  await page.keyboard.press("ArrowRight");
  await expect(readout).toHaveText("10:00");
  await page.keyboard.press("ArrowLeft");
  await expect(readout).toHaveText("09:00");

  // the last hour of the day continues into the next morning
  for (let i = 0; i < 12; i++) await next.click();
  await expect(readout).toHaveText("21:00");
  await next.click();
  await expect(readout).toHaveText("08:00");
  await expect(page.locator('.seg[aria-label="Day"] button').nth(1)).toHaveClass(/is-on/);
});

test("hovering the sounding does not open a scrollbar", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await page.locator('.seg[aria-label="View"] button:has-text("Sounding")').click();
  const svg = page.locator(".sounding");
  await expect(svg).toBeVisible();
  const box = await svg.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.4);
  const high = page.locator(".hover-card strong");
  await expect(high).toBeVisible();
  const above = await high.innerText();
  await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.4 + 12);
  const below = await high.innerText();
  expect(below).not.toBe(above);
  const scroll = await page.locator(".sounding-scroll").evaluate((el) => ({
    x: el.scrollWidth - el.clientWidth,
    y: el.scrollHeight - el.clientHeight,
  }));
  expect(scroll.x).toBeLessThanOrEqual(1);
  expect(scroll.y).toBeLessThanOrEqual(1);
});

test("recent places stay visible and load in one click", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhoton(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator(".rail-recent .rail-empty")).toBeVisible();

  await page.locator("#place").fill("annecy");
  await page.locator('.place-menu button:has-text("Annecy")').click();
  await expect(page.locator(".rail-recent .rail-place")).toContainText("Annecy");

  await page.locator("#place").fill("chamo");
  await page.locator('.place-menu button:has-text("Chamonix-Mont-Blanc")').click();
  const names = page.locator(".rail-recent .rail-place-name");
  await expect(names).toHaveText([/Chamonix-Mont-Blanc/, /^Annecy/]);
  await expect(page.locator(".rail-place-meta")).toHaveCount(0);
  await page.locator('.rail-recent .rail-place:has-text("Annecy")').click();
  await expect(page).toHaveURL(/lat=45\.8992/);
  await expect(page.locator(".place-line strong")).toContainText("Annecy");
  await expect(names).toHaveText([/Chamonix-Mont-Blanc/, /^Annecy/]);
});

test("an old compare link opens the place, not a board", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71&compare=1&pins=45.92,6.87/Plaine%20Joux");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await expect(page.locator(".board-list")).toHaveCount(0);
  await expect(page).not.toHaveURL(/compare=/);
});
