import { test, expect } from '@playwright/test';

test.describe('Ajuste de pesaje real en productos a granel y al corte (#54)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('permite ajustar el pesaje real de báscula en pedidos con productos al corte desde el backoffice', async ({
    page,
  }) => {
    // 1. Iniciar sesión como administrador
    await page.goto('/cuenta');
    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    // 2. Navegar a /admin/pedidos
    await page.goto('/admin/pedidos');
    await expect(page).toHaveURL(/\/admin\/pedidos$/);

    // 3. Abrir el pedido CS-2026-1041 que contiene 'Llonganissa de Vic Tradicional'
    const orderBtn = page.locator('button.ref-button:has-text("CS-2026-1041")');
    await expect(orderBtn).toBeVisible();
    await orderBtn.click();

    // 4. Verificar que se despliega el diálogo modal de detalle
    const modal = page.locator('.order-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#modal-order-title')).toHaveText('CS-2026-1041');

    // 5. Verificar que los productos al corte muestran el distintivo 'Al corte / A granel'
    const cutBadge = modal.locator('.badge-cut-to-order').first();
    await expect(cutBadge).toBeVisible();

    // 6. Localizar el input de pesaje real y el botón de ajustar
    const scaleInput = modal.locator('.scale-weight-input').first();
    await expect(scaleInput).toBeVisible();
    const adjustBtn = modal.locator('.btn-save-weight').first();
    await expect(adjustBtn).toBeVisible();

    // 7. Modificar el pesaje real en la báscula a 300 gramos
    await scaleInput.fill('');
    await scaleInput.fill('300');
    await adjustBtn.click();

    // 8. Verificar confirmación toast y distintivo de pesaje medido en báscula
    const toast = page.locator('.orders-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/300g/);

    const weighedBadge = modal.locator('.badge-weighed-ok').first();
    await expect(weighedBadge).toBeVisible();
    await expect(weighedBadge).toContainText('300g');
  });
});
