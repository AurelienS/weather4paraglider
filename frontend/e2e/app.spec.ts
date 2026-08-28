import { expect, test, type Page } from "@playwright/test";
import { blockTiles, mockOpenMeteo, mockPhoton } from "./mock";

test.beforeEach(async ({ page }: { page: Page }) => {
  await blockTiles(page);
});

test("affiche le windgram AROME du point de l'URL", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".meta")).toContainText("AROME 0.025°");
  await expect(page.locator(".meta")).toContainText("alt. modèle 1696");
  await expect(page.locator('.seg[aria-label="Jour"] button')).toHaveCount(3);
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
});

test("sans paramètre d'URL, retombe sur le point démo Aravis", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/");
  await expect(page).toHaveURL(/lat=45\.945&lon=6\.71/);
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
});

test("le rechargement lit le cache localStorage sans rappeler Open-Meteo", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  const afterFirstLoad = om.calls();
  expect(afterFirstLoad).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  expect(om.calls()).toBe(afterFirstLoad);
});

test("Actualiser force un nouvel appel Open-Meteo", async ({ page }) => {
  const om = await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  const before = om.calls();
  await page.locator('button:has-text("Actualiser")').click();
  await expect(page.locator('button:has-text("Actualiser")')).toBeEnabled({ timeout: 15_000 });
  expect(om.calls()).toBeGreaterThan(before);
});

test("un échec de rafraîchissement conserve les données affichées", async ({ page }) => {
  await mockOpenMeteo(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  const cells = await page.locator(".wg td.cell").count();
  await page.unrouteAll();
  await blockTiles(page);
  await page.route("**/api.open-meteo.com/**", (route) => route.abort());
  await page.locator('button:has-text("Actualiser")').click();
  await expect(page.locator(".banner.error")).toContainText("Impossible de joindre Open-Meteo");
  expect(await page.locator(".wg td.cell").count()).toBe(cells);
  await page.unrouteAll();
  const om2 = await mockOpenMeteo(page);
  await page.locator('.banner.error button:has-text("Réessayer")').click();
  await expect(page.locator(".banner.error")).toHaveCount(0);
  expect(om2.calls()).toBeGreaterThan(0);
});

test("quota Open-Meteo dépassé : message compréhensible et bouton Réessayer", async ({ page }) => {
  await mockOpenMeteo(page, { status: 429 });
  await page.goto("/?lat=45.945&lon=6.71");
  const banner = page.locator(".banner.error");
  await expect(banner).toContainText("Limite d'Open-Meteo atteinte pour ta connexion");
  await expect(banner).toContainText("réessaie dans quelques minutes");
  await expect(banner.locator('button:has-text("Réessayer")')).toBeVisible();
});

test("absence de réseau : message connexion", async ({ page }) => {
  await page.route("**/api.open-meteo.com/**", (route) => route.abort());
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".banner.error")).toContainText(
    "Impossible de joindre Open-Meteo — vérifier ta connexion internet",
  );
});

test("la recherche de lieu charge un nouveau point", async ({ page }) => {
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

test("favoris : sites par défaut, sélection, ajout, retrait et persistance", async ({ page }) => {
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
  await expect(favBtn).toHaveText("Favoris (10)");
  await expect(page.locator(".fav-add")).toBeEnabled();
  await page.locator(".fav-add").click();
  await expect(favBtn).toHaveText("Favoris (11)");

  await page.locator('.fav-list li:has-text("Aravis") .fav-remove').click();
  await expect(favBtn).toHaveText("Favoris (10)");
  await page.mouse.click(20, 500);

  await page.reload();
  await expect(page.locator(".wg td.cell").first()).toBeVisible();
  await favBtn.click();
  await expect(page.locator(".fav-item")).toHaveCount(10);
  await expect(page.locator(".fav-item:has-text('Aravis')")).toHaveCount(0);
  await expect(page.locator(".fav-item:has-text('Chamonix-Mont-Blanc')")).toHaveCount(1);
});

test("sélection d'un point sur la carte et fermeture par Échap", async ({ page }) => {
  await mockOpenMeteo(page);
  await mockPhoton(page);
  await page.goto("/?lat=45.945&lon=6.71");
  await expect(page.locator(".wg td.cell").first()).toBeVisible();

  await page.locator('button:has-text("Carte…")').click();
  const panel = page.locator(".map-panel");
  await expect(panel).toBeVisible();
  const latIn = page.locator('input[aria-label="Latitude"]');
  const lonIn = page.locator('input[aria-label="Longitude"]');
  await expect(latIn).toHaveValue("45.94500");
  await expect(lonIn).toHaveValue("6.71000");

  await page.keyboard.press("Escape");
  await expect(page.locator(".map-overlay")).toHaveCount(0);

  await page.locator('button:has-text("Carte…")').click();
  await expect(panel).toBeVisible();
  const box = await page.locator(".map-holder").boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + 140, box!.y + 100);
  const nextLat = await latIn.inputValue();
  const nextLon = await lonIn.inputValue();
  expect(nextLat).not.toBe("45.94500");
  await expect(page.locator(".map-near")).toContainText("Chamonix-Mont-Blanc");

  await page.locator('button:has-text("Utiliser ce point")').click();
  await expect(page.locator(".map-overlay")).toHaveCount(0);
  const url = new URL(page.url());
  expect(Math.abs(Number(url.searchParams.get("lat")) - Number(nextLat))).toBeLessThan(1e-5);
  expect(Math.abs(Number(url.searchParams.get("lon")) - Number(nextLon))).toBeLessThan(1e-5);
  await expect(page.locator(".place-chip")).toContainText("Chamonix-Mont-Blanc");
});
