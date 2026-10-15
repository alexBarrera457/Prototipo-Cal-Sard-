import { test, expect } from '@playwright/test';

test.describe('Área Privada de Cliente - Mis Pedidos e Historial (Issue #44)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cuenta');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    // Iniciar sesión con el acceso rápido de Cliente de pruebas
    await page.click('.demo-chip:has-text("Cliente")');
    await expect(page.locator('.user-dashboard')).toBeVisible();
    await expect(page.locator('#user-dashboard-title')).toContainText('Jaume Sardà');
  });

  test('1. Visualiza las pestañas de navegación y la sección "Mis Pedidos" por defecto', async ({
    page,
  }) => {
    const tabs = page.locator('.account-tab-btn');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toHaveClass(/active/);
    await expect(tabs.nth(0)).toContainText(/Mis Pedidos|Les meves Comandes/);

    // Comprobar presencia de tarjetas de pedidos
    const orderCards = page.locator('.customer-order-card');
    await expect(orderCards).toHaveCount(2);

    // Verificar referencia y totales
    await expect(page.locator('.customer-orders-list')).toContainText('CS-2026-1041');
    await expect(page.locator('.customer-orders-list')).toContainText('CS-2026-1035');
  });

  test('2. Comprueba la línea temporal de progreso del pedido (Timeline)', async ({ page }) => {
    // La comanda CS-2026-1041 está 'en_preparacion'
    const activeOrderCard = page.locator('.customer-order-card', { hasText: 'CS-2026-1041' });
    await expect(activeOrderCard).toBeVisible();

    const timelineSteps = activeOrderCard.locator('.timeline-step');
    await expect(timelineSteps).toHaveCount(4);

    // El primer paso (Recibido) y segundo (En preparación) deben estar activos
    await expect(timelineSteps.nth(0)).toHaveClass(/step-active/);
    await expect(timelineSteps.nth(1)).toHaveClass(/step-active/);
  });

  test('3. Despliega los detalles de productos y repite un pedido anterior en la cesta', async ({
    page,
  }) => {
    const deliveredOrderCard = page.locator('.customer-order-card', { hasText: 'CS-2026-1035' });
    await expect(deliveredOrderCard).toBeVisible();

    // Desplegar artículos
    await deliveredOrderCard.locator('.btn-toggle-items').click();
    await expect(deliveredOrderCard.locator('.items-expanded-table')).toBeVisible();
    await expect(deliveredOrderCard.locator('.items-expanded-table')).toContainText(
      'Cafè de Finca Torrat Artesanal 250g',
    );

    // Repetir encargo
    const reorderBtn = deliveredOrderCard.locator('.btn-reorder');
    await expect(reorderBtn).toBeVisible();
    await reorderBtn.click();

    // Comprobar toast de confirmación
    const toast = page.locator('.account-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/añadido|afegit/);
  });

  test('4. Comprueba la presencia del botón de descarga de factura oficial', async ({ page }) => {
    const orderCard = page.locator('.customer-order-card').first();
    const invoiceBtn = orderCard.locator('.btn-invoice');
    await expect(invoiceBtn).toBeVisible();
    await expect(invoiceBtn).toContainText(/Factura/);
  });

  test('5. Permite alternar entre pestañas del área privada (Perfil, Direcciones, Pedidos)', async ({
    page,
  }) => {
    const tabs = page.locator('.account-tab-btn');

    // Cambiar a pestaña Perfil
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveClass(/active/);
    await expect(page.locator('.profile-card')).toBeVisible();

    // Cambiar a pestaña Direcciones
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveClass(/active/);
    await expect(page.locator('.addresses-grid')).toBeVisible();

    // Volver a Mis Pedidos
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveClass(/active/);
    await expect(page.locator('.tab-orders')).toBeVisible();
  });
});
