import { test, expect } from '@playwright/test';

test.describe('Notificaciones y Alertas por Cambio de Estado (Issue #46)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cuenta');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('1. Admin actualiza estado de pedido en backoffice y se refleja en tiempo real', async ({
    page,
  }) => {
    // Iniciar sesión como Admin
    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    // Navegar al gestor de pedidos
    await page.goto('/admin/pedidos');
    await expect(page.locator('.admin-orders-page')).toBeVisible();

    // Localizar pedido CS-2026-1040 (Laia Vidal, pickup)
    const row = page.locator('.orders-table tbody tr:has-text("CS-2026-1040")');
    await expect(row).toBeVisible();

    // Abrir modal de detalle
    await row.locator('.ref-button').click();
    const modal = page.locator('.order-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('CS-2026-1040');

    // Avanzar de 'recibido' a 'en_preparacion'
    const prepBtn = modal.locator('.btn-modal-action.btn-prep');
    await expect(prepBtn).toBeVisible();
    await prepBtn.click();

    // Avanzar de 'en_preparacion' a 'listo_recogida'
    const readyBtn = modal.locator('.btn-modal-action.btn-ready');
    await expect(readyBtn).toBeVisible();
    await readyBtn.click();

    // Verificar que el badge en el modal se actualiza
    await expect(modal.locator('.status-badge')).toContainText(/recogida|recollida|listo/i);

    // Cerrar modal
    await modal.locator('.modal-close-btn').click();
    await expect(modal).not.toBeVisible();

    // Comprobar que en la tabla principal el pedido muestra el nuevo estado
    await expect(row.locator('.status-badge')).toContainText(/recogida|recollida|listo/i);
  });

  test('2. El cliente percibe el avance de estado en su panel privado con cronograma activo', async ({
    page,
  }) => {
    // Primero, como admin avanzamos un pedido de Jaume Sardà
    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();
    await page.goto('/admin/pedidos');

    const orderRow = page.locator('.orders-table tbody tr:has-text("CS-2026-1041")');
    await expect(orderRow).toBeVisible();

    // CS-2026-1041 está 'en_preparacion' y es 'delivery'.
    // Avanzar mediante el botón rápido de fila a 'enviado'
    const advanceBtn = orderRow.locator('.btn-advance');
    await expect(advanceBtn).toBeVisible();
    await advanceBtn.click();

    await expect(orderRow.locator('.status-badge')).toContainText(/Enviado|Enviat/i);

    // Cerrar sesión de admin usando el botón de la barra superior del backoffice (SPA navigation)
    await page.click('.topbar-signout-btn');
    await expect(page.locator('.login-card')).toBeVisible();

    // Iniciar sesión como Cliente Jaume Sardà
    await page.click('.demo-chip:has-text("Cliente"), .demo-chip:has-text("Client")');
    await expect(page.locator('#user-dashboard-title')).toContainText('Jaume Sardà');

    // Comprobar que el pedido CS-2026-1041 muestra el estado actualizado "enviado"
    const customerOrderCard = page.locator('.customer-order-card:has-text("CS-2026-1041")');
    await expect(customerOrderCard).toBeVisible();
    await expect(customerOrderCard.locator('.status-badge')).toContainText(/enviado/i);

    // Verificar que el cronograma tiene activos los pasos 0, 1 y 2
    const steps = customerOrderCard.locator('.timeline-step');
    await expect(steps).toHaveCount(4);
    await expect(steps.nth(0)).toHaveClass(/step-active/);
    await expect(steps.nth(1)).toHaveClass(/step-active/);
    await expect(steps.nth(2)).toHaveClass(/step-active/);
  });
});
