import { test, expect } from '@playwright/test';

test.describe('Recuperación reactiva de carritos abandonados (#70)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('detecta cesta abandonada tras inactividad, muestra el banner y permite retomar el pedido', async ({
    page,
  }) => {
    // 1. Añadir producto a la cesta desde la tienda
    await page.goto('/tienda-online');
    await expect(page).toHaveTitle(/Tienda online/i);

    const firstProductAddBtn = page.locator('button.store-button').first();
    await expect(firstProductAddBtn).toBeVisible();
    await firstProductAddBtn.click();

    // Comprobar que la cesta tiene al menos 1 producto en el navbar
    const cartCount = page.locator('.cart-count');
    await expect(cartCount).toHaveText('1');

    // 2. Simular abandono de carrito (inactividad superior a 2 horas)
    await page.evaluate(() => {
      const threeHoursAgo = Date.now() - 3 * 3600 * 1000;
      localStorage.setItem(
        'cal_sarda_abandoned_cart',
        JSON.stringify({ lastUpdated: threeHoursAgo }),
      );
    });

    // 3. El usuario regresa a la web (ej. a la página de inicio)
    await page.goto('/');

    // 4. Debe aparecer el banner discreto de recuperación de cesta
    const banner = page.locator('.abandoned-cart-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/selección/i);

    // 5. Hacer clic en "Retomar mi compra"
    const resumeBtn = banner.locator('.btn-resume-cart');
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    // 6. Debe redirigir a la tramitación de pedido conservando los productos
    await expect(page).toHaveURL(/\/preparar-pedido/);
    await expect(page.locator('.checkout-summary')).toBeVisible();
    await expect(banner).not.toBeVisible();
  });

  test('permite descartar el aviso de cesta pendiente', async ({ page }) => {
    // 1. Simular cesta guardada hace 3 horas
    await page.evaluate(() => {
      const items = [{ name: 'Secallona artesana', price: 6.8, quantity: 1 }];
      localStorage.setItem('cal-sarda-cart', JSON.stringify(items));
      const threeHoursAgo = Date.now() - 3 * 3600 * 1000;
      localStorage.setItem(
        'cal_sarda_abandoned_cart',
        JSON.stringify({ lastUpdated: threeHoursAgo }),
      );
    });

    await page.goto('/tienda-online');

    const banner = page.locator('.abandoned-cart-banner');
    await expect(banner).toBeVisible();

    // 2. Descartar aviso
    const dismissBtn = banner.locator('.btn-dismiss-cart');
    await dismissBtn.click();

    // El banner desaparece
    await expect(banner).not.toBeVisible();
  });

  test('muestra la sección de carritos abandonados en el backoffice de pedidos', async ({
    page,
  }) => {
    // Iniciar sesión como administrador
    await page.goto('/cuenta');
    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    // Navegar al panel de pedidos
    await page.goto('/admin/pedidos');
    await expect(page.locator('#abandoned-carts-title')).toBeVisible();

    // Verificar que existe tabla con carritos y botón de enviar recordatorio
    const reminderBtn = page.locator('.abandoned-carts-section .btn-action').first();
    await expect(reminderBtn).toBeVisible();
    await reminderBtn.click();

    // Verificar mensaje de confirmación
    const toast = page.locator('.orders-toast');
    await expect(toast).toBeVisible();
  });
});
