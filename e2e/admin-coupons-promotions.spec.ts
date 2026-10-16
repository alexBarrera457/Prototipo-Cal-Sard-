import { test, expect } from '@playwright/test';

test.describe('Motor de cupones de descuento y promociones (#51)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('permite gestionar cupones desde el panel de administración', async ({ page }) => {
    // 1. Iniciar sesión como administrador
    await page.goto('/cuenta');
    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    // 2. Navegar a /admin/cupones desde la barra lateral
    await page.goto('/admin');
    const couponsNavLink = page.locator('aside.admin-sidebar a[href*="cupones"]');
    await expect(couponsNavLink).toBeVisible();
    await couponsNavLink.click();
    await expect(page).toHaveURL(/\/admin\/cupones/);

    // 3. Verificar que se cargan los KPIs y cupones iniciales
    await expect(page.locator('#kpi-active-count')).toBeVisible();
    await expect(page.locator('.coupon-code-pill:has-text("BENVINGUTS10")')).toBeVisible();

    // 4. Crear un nuevo cupón
    await page.click('#btn-create-coupon');
    await expect(page.locator('.coupon-modal')).toBeVisible();

    await page.fill('#coupon-code', 'PROMO25');
    await page.fill('#coupon-desc', 'Descuento 25% verano');
    await page.fill('#coupon-value', '25');
    await page.fill('#coupon-min', '15');
    await page.click('#btn-save-coupon');

    // 5. Verificar que el modal se cierra y el nuevo cupón aparece en la tabla
    await expect(page.locator('.coupon-modal')).not.toBeVisible();
    await expect(page.locator('.coupon-code-pill:has-text("PROMO25")')).toBeVisible();

    // 6. Filtrar por búsqueda
    await page.fill('#search-coupons-input', 'PROMO25');
    await expect(page.locator('.coupon-code-pill')).toHaveCount(1);
  });

  test('valida y aplica reactivamente un cupón en la pasarela de compra', async ({ page }) => {
    // 1. Cargar la cesta con productos suficientes para superar compras mínimas (57,00 €)
    await page.goto('/');
    await page.evaluate(() => {
      const items = [
        {
          name: 'Paleta Ibèrica de Bellota 100g',
          price: 28.5,
          quantity: 2,
          image: '/images/products/jamon.webp',
        },
      ];
      localStorage.setItem('cal-sarda-cart', JSON.stringify(items));
    });

    // 2. Ir a preparar pedido (checkout)
    await page.goto('/preparar-pedido');
    await expect(page.locator('.checkout-summary')).toBeVisible();

    const couponInput = page.locator('#checkout-coupon-input');
    const applyBtn = page.locator('#btn-apply-coupon');
    await expect(couponInput).toBeVisible();
    await expect(applyBtn).toBeVisible();

    // 3. Probar cupón erróneo
    await couponInput.fill('INVALIDCODE');
    await applyBtn.click();
    await expect(page.locator('#coupon-error-msg')).toBeVisible();
    await expect(page.locator('#checkout-discount-row')).not.toBeVisible();

    // 4. Aplicar cupón válido del colmado (BENVINGUTS10 o COLMADO5)
    await couponInput.fill('COLMADO5');
    await applyBtn.click();

    // 5. Verificar desglose reactivo del descuento en el resumen
    await expect(page.locator('#checkout-discount-row')).toBeVisible();
    await expect(page.locator('#coupon-success-msg')).toBeVisible();
    await expect(page.locator('.coupon-applied-badge')).toBeVisible();

    // 6. Probar botón de quitar cupón
    await page.click('#btn-remove-coupon');
    await expect(page.locator('#checkout-discount-row')).not.toBeVisible();
    await expect(page.locator('.coupon-applied-badge')).not.toBeVisible();

    // 7. Volver a aplicar y formalizar el encargo
    await couponInput.fill('COLMADO5');
    await applyBtn.click();
    await expect(page.locator('#checkout-discount-row')).toBeVisible();

    // Rellenar formulario de cliente
    await page.fill('input[name="name"]', 'Rosa Soler');
    await page.fill('input[name="email"]', 'rosa.soler@example.cat');
    await page.fill('input[name="phone"]', '654987321');

    // Botón preparar vista previa
    await page.click('.checkout-submit');
    await expect(page.locator('.order-preview')).toBeVisible();

    // Confirmar pedido
    await page.click('.confirm-order-btn');

    // 8. Pantalla de confirmación con reflejo del descuento aplicado
    await expect(page.locator('.confirmation-hero-card')).toBeVisible();
    await expect(page.locator('.discount-fin-row')).toBeVisible();
  });
});
