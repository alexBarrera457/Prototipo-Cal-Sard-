import { test, expect } from '@playwright/test';

test.describe('Selector de Fecha y Franja Horaria de Entrega y Recogida (#65)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Añadir producto al carrito
    await page.goto('/tienda-online/producto/cafe-100-robusta');
    await page.locator('.product-detail-button').click();
    await expect(page.locator('.cart-count')).toHaveText('1');

    // Navegar al checkout (/preparar-pedido)
    await page.goto('/preparar-pedido');
    await expect(page.locator('.checkout-page')).toBeVisible();
  });

  test('muestra el selector de franjas horarias y bloquea la selección de domingos en el obrador', async ({
    page,
  }) => {
    // 1. Verificar presencia de la sección de franjas y aviso de preparación
    const slotsSection = page.locator('#checkout-slots-section');
    await expect(slotsSection).toBeVisible();
    await expect(slotsSection).toContainText(/mínimo 2 horas|mínim 2 hores/);

    // 2. Rellenar datos del cliente
    await page.fill('input[name="name"]', 'Antoni Gaudí');
    await page.fill('input[name="email"]', 'gaudi@sagradafamilia.cat');
    await page.fill('input[name="phone"]', '612 34 56 78');

    // 3. Probar selección de un domingo (2026-10-18)
    const dateInput = page.locator('#checkout-slot-date');
    await dateInput.fill('2026-10-18');

    // Intentar avanzar a la vista previa
    await page.click('.checkout-submit:has-text("PREPARAR VISTA PREVIA")');

    // Comprobar mensaje de error de descanso dominical
    const dateError = page.locator('#slot-date-error');
    await expect(dateError).toBeVisible();
    await expect(dateError).toContainText(/domingos|diumenges/i);
    await expect(page.locator('.order-preview')).not.toBeVisible();

    // 4. Seleccionar un día hábil (Martes 2026-10-20)
    await dateInput.fill('2026-10-20');

    // 5. Seleccionar la franja horaria de tarde (17:00 - 19:00)
    const afternoonChip = page.locator('#slot-chip-afternoon');
    await expect(afternoonChip).toBeVisible();
    await afternoonChip.click();
    await expect(afternoonChip).toHaveClass(/selected/);

    // 6. Avanzar a vista previa
    await page.click('.checkout-submit:has-text("PREPARAR VISTA PREVIA")');
    await expect(page.locator('.order-preview')).toBeVisible();

    // Verificar franja concertada en la vista previa
    const previewSlot = page.locator('#preview-slot-box');
    await expect(previewSlot).toBeVisible();
    await expect(previewSlot).toContainText('2026-10-20');
    await expect(previewSlot).toContainText('17:00 - 19:00');

    // 7. Confirmar pedido
    await page.click('.confirm-order-btn');
    await expect(page.locator('.confirmation-container')).toBeVisible();

    // Verificar cita concertada en la pantalla final de confirmación
    const confirmSlot = page.locator('#confirmation-slot-box');
    await expect(confirmSlot).toBeVisible();
    await expect(confirmSlot).toContainText('2026-10-20');
    await expect(confirmSlot).toContainText('17:00 - 19:00');
  });

  test('adapta el aviso de antelación mínima al cambiar a reparto a domicilio (mínimo 24 horas)', async ({
    page,
  }) => {
    // Modalidad recogida en tienda: aviso de 2 horas
    const slotsSection = page.locator('#checkout-slots-section');
    await expect(slotsSection).toContainText(/2 horas|2 hores/);

    // Cambiar a reparto a domicilio
    await page.click('label.fulfillment-choice:has(input[value="delivery"])');

    // Aviso adaptado a reparto a domicilio: mínimo 24 horas
    await expect(slotsSection).toContainText(/24 horas|24 hores/);
  });
});
