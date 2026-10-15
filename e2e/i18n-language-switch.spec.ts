import { test, expect } from '@playwright/test';

test.describe('Selector de idioma y cobertura bilingüe (i18n)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('el selector solo ofrece opciones funcionales (Català y Español)', async ({ page }) => {
    const langSelect = page.locator('.language-control select');
    await expect(langSelect).toBeVisible();

    const options = await langSelect.locator('option').allTextContents();
    expect(options).toEqual(['Català', 'Español']);
  });

  test('cambia dinámicamente de idioma en cabecera, hero y catálogo, y persiste en recarga', async ({
    page,
  }) => {
    // Estado inicial en español
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('.hero-button')).toContainText('VER PRODUCTOS');
    await expect(page.locator('.cart-label')).toHaveText('CESTA');
    await expect(page.locator('.account-button span')).toHaveText('Mi cuenta');

    // Cambiar a Català
    const langSelect = page.locator('.language-control select');
    await langSelect.selectOption('ca');

    // Verificar actualización inmediata al catalán
    await expect(page.locator('html')).toHaveAttribute('lang', 'ca');
    await expect(page.locator('.hero-button')).toContainText('VEURE PRODUCTES');
    await expect(page.locator('.philosophy-label')).toContainText('LA NOSTRA FILOSOFIA');
    await expect(page.locator('.cart-label')).toHaveText('CISTELLA');
    await expect(page.locator('.account-button span')).toHaveText('El meu compte');

    // Verificar en la tienda online
    await page.goto('/tienda-online');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ca');
    await expect(page.locator('.shop-intro a')).toContainText('ANAR A LA COMPRA');
    const allCategoriesBtn = page.locator('.store-categories button').first();
    await expect(allCategoriesBtn).toContainText('Tots els productes');

    // Persistencia tras recargar la página
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ca');
    await expect(page.locator('.cart-label')).toHaveText('CISTELLA');

    // Cambiar de nuevo a Español
    await page.locator('.language-control select').selectOption('es');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('.cart-label')).toHaveText('CESTA');
  });

  test('traduce páginas de marca y detalle de producto en catalán', async ({ page }) => {
    // Establecer catalán en localStorage antes de navegar
    await page.addInitScript(() => {
      localStorage.setItem('cal-sarda-lang', 'ca');
    });

    // Visitar la página de historia
    await page.goto('/historia');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ca');
    await expect(page.locator('.brand-page-eyebrow')).toHaveText('Història');
    await expect(page.locator('h1')).toHaveText('La nostra història');

    // Visitar la ficha de producto
    await page.goto('/tienda-online/producto/cafe-100-robusta');
    await expect(page.locator('.product-detail-back')).toContainText('TORNAR A LA BOTIGA');
    await expect(page.locator('.product-detail-label')).toContainText('CAL SARDÀ · PRODUCTE');
    await expect(page.locator('.product-detail-button')).toContainText('AFEGIR A LA CISTELLA');

    // Visitar preparar pedido
    await page.goto('/preparar-pedido');
    await expect(page.locator('.checkout-heading span')).toHaveText('CAL SARDÀ · COMPRA');
    await expect(page.locator('.checkout-empty h2')).toHaveText('La teva cistella està buida');
    await expect(page.locator('.checkout-empty a')).toHaveText('VEURE LA BOTIGA →');
  });
});
