import { test, expect } from '@playwright/test';

test.describe('Tarjetas Regalo Digitales y Canje en Checkout (#64)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('permite consultar saldo existente y adquirir una nueva tarjeta regalo personalizada', async ({
    page,
  }) => {
    // 1. Acceder a la página de tarjeta regalo
    await page.goto('/tarjeta-regalo');
    await expect(page.locator('#gift-card-heading')).toBeVisible();

    // 2. Probar la pestaña de consulta de saldo
    const tabCheckBtn = page.locator('#tab-check-btn');
    await expect(tabCheckBtn).toBeVisible();
    await tabCheckBtn.click();

    // Consultar tarjeta inicial predefinida (50 €)
    const checkInput = page.locator('#check-balance-input');
    await checkInput.fill('REGAL-CS-50');
    await page.locator('#btn-do-check-balance').click();

    const resultBox = page.locator('#balance-result-box');
    await expect(resultBox).toBeVisible();
    await expect(resultBox).toContainText('50,00');
    await expect(resultBox).toContainText('Client Fidel');

    // 3. Volver a la pestaña de compra
    const tabBuyBtn = page.locator('#tab-buy-btn');
    await tabBuyBtn.click();
    await expect(page.locator('#amount-heading')).toBeVisible();

    // Seleccionar chip de 75 €
    const chip75 = page.locator('.preset-chip:has-text("75 €")');
    await chip75.click();
    await expect(chip75).toHaveClass(/active/);

    // Rellenar formulario de emisión
    await page.locator('#recipient-name-input').fill('Núria Casals');
    await page.locator('#recipient-email-input').fill('nuria@example.cat');
    await page.locator('#sender-name-input').fill('Pau Vila');
    await page
      .locator('#card-dedication-input')
      .fill('Per celebrar el teu sant amb el millor del colmado!');

    // Comprobar la vista previa interactiva
    const livePreview = page.locator('#gift-card-live-preview');
    await expect(livePreview).toContainText('75,00');
    await expect(livePreview).toContainText('Núria Casals');
    await expect(livePreview).toContainText('Pau Vila');

    // Emitir tarjeta
    const purchaseBtn = page.locator('#btn-purchase-gift-card');
    await expect(purchaseBtn).toBeEnabled();
    await purchaseBtn.click();

    // Verificar vista de éxito y tarjeta emitida
    await expect(page.locator('#gift-card-success-view')).toBeVisible();
    const issuedCode = page.locator('#issued-gift-card-code');
    await expect(issuedCode).toBeVisible();
    await expect(issuedCode).toContainText('REGAL-CS-');
    await expect(page.locator('#issued-voucher-card')).toContainText('75,00');
  });

  test('permite canjear una tarjeta regalo en el checkout descontando su saldo del total', async ({
    page,
  }) => {
    // 1. Añadir producto al carrito desde la ficha de producto
    await page.goto('/tienda-online/producto/cafe-100-robusta');
    await page.locator('.product-detail-button').click();
    await expect(page.locator('.cart-count')).toHaveText('1');

    // 2. Navegar al checkout (/preparar-pedido)
    await page.goto('/preparar-pedido');
    await expect(page.locator('.checkout-form-panel')).toBeVisible();

    // 3. Aplicar tarjeta regalo de 50 €
    const giftCardInput = page.locator('#checkout-gift-card-input');
    await expect(giftCardInput).toBeVisible();
    await giftCardInput.fill('REGAL-CS-50');
    await page.locator('#btn-apply-gift-card').click();

    // 4. Verificar que se muestra la tarjeta aplicada y la fila de descuento
    await expect(page.locator('.gift-card-applied-badge')).toBeVisible();
    await expect(page.locator('.gift-card-applied-badge')).toContainText('REGAL-CS-50');

    const discountRow = page.locator('#checkout-gift-card-row');
    await expect(discountRow).toBeVisible();
    await expect(discountRow).toContainText('REGAL-CS-50');
    await expect(discountRow).toContainText('-');

    // 5. Verificar que se puede desaplicar la tarjeta
    const removeBtn = page.locator('#btn-remove-gift-card');
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();
    await expect(discountRow).not.toBeVisible();
    await expect(page.locator('#checkout-gift-card-input')).toBeVisible();
  });
});
