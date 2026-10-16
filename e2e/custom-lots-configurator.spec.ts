import { test, expect } from '@playwright/test';

test.describe('Configurador de lotes y cestas gourmet a medida («Fes el teu Lot» #63)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('permite componer un lote personalizado por pasos, añadir dedicatoria y enviarlo a la cesta', async ({
    page,
  }) => {
    // 1. Acceder a la sección de lotes gourmet y hacer clic en el acceso al configurador
    await page.goto('/lotes-y-cestas-gourmet');
    const ctaButton = page.locator('a:has-text("Fes el teu Lot")').first();
    await expect(ctaButton).toBeVisible();
    await ctaButton.click();

    // 2. Verificar que aterriza en /lotes-a-medida
    await expect(page).toHaveURL(/\/lotes-a-medida$/);
    await expect(page.locator('#custom-lots-heading')).toBeVisible();

    // 3. PASO 1: Comprobar las 3 opciones de estuche y seleccionar Cesta de mimbre (12,00 €)
    const wickerCard = page.locator('.packaging-card:has-text("Cesta de mimbre")');
    await expect(wickerCard).toBeVisible();
    await wickerCard.click();
    await expect(wickerCard).toHaveClass(/selected/);

    // Comprobar que la barra flotante inferior computa los 12,00 € del estuche
    const stickyTotal = page.locator('#sticky-total-price');
    await expect(stickyTotal).toContainText('12,00');

    // Avanzar al paso 2
    await page.locator('.btn-primary-step:has-text("Continuar")').click();

    // 4. PASO 2: Selección de productos del colmado
    await expect(page.locator('#step2-title')).toBeVisible();

    // Comprobar filtrado por chips
    const hamFilter = page.locator('.filter-chip:has-text("Jamones")');
    await expect(hamFilter).toBeVisible();
    await hamFilter.click();

    // Añadir el primer producto disponible con botón +
    const firstPlusBtn = page.locator('.lot-product-card .btn-plus').first();
    await expect(firstPlusBtn).toBeVisible();
    await firstPlusBtn.click();

    // Cambiar a quesos y añadir otro producto
    const cheeseFilter = page.locator('.filter-chip:has-text("Quesos")');
    await cheeseFilter.click();
    const secondPlusBtn = page.locator('.lot-product-card .btn-plus').first();
    await secondPlusBtn.click();

    // Verificar que el contador en la barra sticky muestra 2 productos añadidos
    const counterBadge = page.locator('.sticky-items-counter');
    await expect(counterBadge).toContainText('2');

    // Avanzar al paso 3: Dedicatoria
    const nextDedicationBtn = page.locator('.btn-step2-next');
    await expect(nextDedicationBtn).toBeEnabled();
    await nextDedicationBtn.click();

    // 5. PASO 3: Redactar mensaje y dedicatoria
    await expect(page.locator('#step3-title')).toBeVisible();

    await page.fill('#sender-input', 'Familia Roca');
    await page.fill('#recipient-input', 'Montserrat Puig');
    await page.fill(
      '#dedication-textarea',
      'Moltes felicitats per les festes, gaudiu d’aquest lot artesà de Cal Sardà!',
    );

    // Verificar que la vista previa de la tarjeta se actualiza en vivo
    const cardPreview = page.locator('#card-preview-box');
    await expect(cardPreview).toBeVisible();
    await expect(cardPreview).toContainText('Montserrat Puig');
    await expect(cardPreview).toContainText('Moltes felicitats per les festes');
    await expect(cardPreview).toContainText('Familia Roca');

    // 6. Añadir a la cesta
    const addLotBtn = page.locator('#btn-add-custom-lot-cart');
    await expect(addLotBtn).toBeVisible();
    await addLotBtn.click();

    // 7. Verificar redirección al checkout (/preparar-pedido) con el lote integrado
    await expect(page).toHaveURL(/\/preparar-pedido$/);

    const summarySection = page.locator('.checkout-summary');
    await expect(summarySection).toBeVisible();
    await expect(summarySection.locator('.badge-custom-lot')).toBeVisible();
    await expect(summarySection).toContainText('Cesta de mimbre');
    await expect(summarySection).toContainText('Montserrat Puig');
  });
});
