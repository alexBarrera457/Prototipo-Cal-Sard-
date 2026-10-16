import { test, expect } from '@playwright/test';

test.describe('Analítica de ventas por categoría y productos estrella (#53)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('muestra el desglose de ventas por categoría, top productos estrella y comparativa periódica', async ({
    page,
  }) => {
    // 1. Iniciar sesión como administrador
    await page.goto('/cuenta');
    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    // 2. Navegar al panel de control /admin
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin$/);

    // 3. Verificar sección de analítica comercial
    const analyticsSection = page.locator('#analytics-commercial-section');
    await expect(analyticsSection).toBeVisible();

    // 4. Verificar desglose por categoría
    const categoryBars = page.locator('#category-bars-container');
    await expect(categoryBars).toBeVisible();
    await expect(categoryBars.locator('.category-bar-item')).toHaveCount(6);

    // Comprobar que contiene categorías representativas del colmado
    await expect(categoryBars).toContainText(/Embutidos y Jamones/i);
    await expect(categoryBars).toContainText(/Quesos de Pastor/i);
    await expect(categoryBars).toContainText(/Conservas y Aceites/i);

    // 5. Verificar top 5 productos estrella
    const topStars = page.locator('#top-stars-container');
    await expect(topStars).toBeVisible();
    await expect(topStars.locator('.star-product-item')).toHaveCount(5);
    await expect(topStars).toContainText(/unidades vendidas/i);

    // 6. Verificar comparativa periódica y crecimiento
    const growthBadge = page.locator('#period-growth-rate');
    await expect(growthBadge).toBeVisible();
    await expect(page.locator('.period-comparison-card')).toContainText(/vs Septiembre 2026/i);

    // 7. Verificar tarjeta de productos con baja rotación
    const lowRotCard = page.locator('.low-rotation-card');
    await expect(lowRotCard).toBeVisible();
  });
});
