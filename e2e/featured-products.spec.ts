import { test, expect } from '@playwright/test';

test.describe('E2E: Productos Destacados en Portada y Tienda', () => {
  test('1. La Portada (Home) muestra la sección de productos destacados con los 6 productos insignia', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // La sección de destacados debe ser visible
    const featuredSection = page.locator('#destacados');
    await expect(featuredSection).toBeVisible();

    // Comprobar tarjetas destacadas
    const cards = page.locator('.home-featured-grid .featured-card');
    await expect(cards).toHaveCount(6);

    // Comprobar el enlace "Ver todos los productos destacados"
    const seeAllLink = page.locator('.home-text-link[href*="orden=featured"]');
    await expect(seeAllLink).toBeVisible();
    await seeAllLink.click();

    // Debe navegar a la tienda con query param orden=featured
    await expect(page).toHaveURL(/\/tienda-online\?orden=featured/);
  });

  test('2. En la Tienda, los productos destacados muestran la insignia ⭐ y encabezan la lista', async ({
    page,
  }) => {
    await page.goto('/tienda-online?orden=featured');
    await page.waitForLoadState('networkidle');

    // Selector de orden debe tener seleccionado "featured"
    const sortSelect = page.locator('.store-sort select');
    await expect(sortSelect).toHaveValue('featured');

    // La primera tarjeta debe ser destacada y contener la insignia ⭐
    const firstProduct = page.locator('.store-product').first();
    const featuredBadge = firstProduct.locator('.badge-featured');
    await expect(featuredBadge).toBeVisible();
    await expect(featuredBadge).toContainText(/⭐ Destacado|⭐ Destacat/);
  });

  test('3. En Backoffice, los productos destacados persisten en localStorage tras recargar', async ({
    page,
  }) => {
    // Iniciar sesión como administrador
    await page.goto('/cuenta');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    // Ir al catálogo
    await page.goto('/admin/productos');
    await expect(page.locator('.admin-catalog')).toBeVisible();

    // Comprobar que el KPI de destacados muestra al menos 6
    const kpiDestacados = page.locator('.kpi-card:has-text("Destacados") .kpi-value');
    await expect(kpiDestacados).toHaveText('6');

    // Recargar la página para verificar que la persistencia en localStorage mantiene el estado
    await page.reload();
    await expect(page.locator('.kpi-card:has-text("Destacados") .kpi-value')).toHaveText('6');
  });
});
