import { test, expect } from '@playwright/test';

test.describe('Pasarela de Pagos Online: Tarjeta y Bizum (Issue #45)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Añadir un producto conocido a la cesta desde su ficha
    await page.goto('/tienda-online/producto/cafe-100-robusta');
    await page.locator('.product-detail-button').click();
    await expect(page.locator('.cart-count')).toHaveText('1');

    // Ir a la página de formalizar pedido
    await page.goto('/preparar-pedido');
    await expect(page.locator('.checkout-page')).toBeVisible();
  });

  test('1. Permite seleccionar tarjeta bancaria, validar datos y completar el cobro online (SCA PSD2)', async ({
    page,
  }) => {
    // Rellenar datos del cliente
    await page.fill('input[name="name"]', 'Laura Font');
    await page.fill('input[name="email"]', 'laura.font@calsarda.com');
    await page.fill('input[name="phone"]', '655 123 456');

    // Seleccionar método de pago Tarjeta
    await page.click('label.payment-choice:has(input[value="card"])');

    // Rellenar datos de tarjeta segura
    await page.fill('input[name="cardNumber"]', '4242 4242 4242 4242');
    await page.fill('input[name="cardExp"]', '12/28');
    await page.fill('input[name="cardCvc"]', '123');

    // Pasar a vista previa
    await page.click('.checkout-submit:has-text("PREPARAR VISTA PREVIA")');
    await expect(page.locator('.order-preview')).toBeVisible();

    // Comprobar distintivo de tarjeta en la vista previa
    const previewBadge = page.locator('.preview-payment-badge');
    await expect(previewBadge).toBeVisible();
    await expect(previewBadge).toContainText(/Tarjeta bancaria|Targeta bancària/);
    await expect(previewBadge).toContainText('4242');

    // Confirmar y autorizar pago
    await page.click('.confirm-order-btn');

    // Comprobar pantalla de confirmación
    await expect(page.locator('.confirmation-container')).toBeVisible();
    await expect(page.locator('.reference-code')).toBeVisible();

    // Comprobar distintivo de pago confirmado y código de transacción
    const confirmedBadge = page.locator('.payment-confirmed-badge');
    await expect(confirmedBadge).toBeVisible();
    await expect(confirmedBadge).toContainText(/Pago verificado|Pagament verificat/);

    const txId = page.locator('.payment-tx-id code');
    await expect(txId).toBeVisible();
    await expect(txId).toContainText('TX-CARD-VISA-');
  });

  test('2. Permite tramitar el pedido mediante Bizum instantáneo', async ({ page }) => {
    await page.fill('input[name="name"]', 'Oriol Junyent');
    await page.fill('input[name="email"]', 'oriol.junyent@calsarda.com');
    await page.fill('input[name="phone"]', '622 998 877');

    // Seleccionar Bizum
    await page.click('label.payment-choice:has(input[value="bizum"])');
    await page.fill('input[name="bizumPhone"]', '622 998 877');

    // Avanzar a vista previa
    await page.click('.checkout-submit:has-text("PREPARAR VISTA PREVIA")');
    await expect(page.locator('.order-preview')).toBeVisible();

    // Comprobar distintivo Bizum en vista previa
    await expect(page.locator('.preview-payment-badge')).toContainText('Bizum');

    // Confirmar pedido
    await page.click('.confirm-order-btn');

    // Comprobar resultado con transacción de Bizum
    await expect(page.locator('.confirmation-container')).toBeVisible();
    const txId = page.locator('.payment-tx-id code');
    await expect(txId).toContainText('TX-BIZUM-');
  });

  test('3. Simula denegación bancaria por fondos insuficientes (tarjeta acabada en 0002)', async ({
    page,
  }) => {
    await page.fill('input[name="name"]', 'Test Denegado');
    await page.fill('input[name="email"]', 'denegado@calsarda.com');
    await page.fill('input[name="phone"]', '633 111 222');

    // Seleccionar Tarjeta y poner tarjeta con fondos insuficientes
    await page.click('label.payment-choice:has(input[value="card"])');
    await page.fill('input[name="cardNumber"]', '4000 0000 0000 0002');
    await page.fill('input[name="cardExp"]', '12/28');
    await page.fill('input[name="cardCvc"]', '123');

    // Avanzar a vista previa
    await page.click('.checkout-submit:has-text("PREPARAR VISTA PREVIA")');
    await expect(page.locator('.order-preview')).toBeVisible();

    // Intentar confirmar pedido
    await page.click('.confirm-order-btn');

    // Verificar alerta de error en la pasarela y no confirmación
    const errorAlert = page.locator('.payment-error-alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/fondos insuficientes|límit excedit/);
    await expect(page.locator('.confirmation-container')).not.toBeVisible();
  });
});
