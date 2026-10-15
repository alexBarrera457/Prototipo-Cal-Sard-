import { test, expect } from '@playwright/test';

test.describe('Suite E2E de Seguridad y Ciclo de Vida Completo de Pedidos (Issue #47)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Seguridad: bloquea accesos no autorizados a /admin y redirige a /cuenta', async ({
    page,
  }) => {
    // 1.1 Acceso anónimo
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/cuenta/);
    await expect(page.locator('.login-card')).toBeVisible();

    await page.goto('/admin/pedidos');
    await expect(page).toHaveURL(/\/cuenta/);

    await page.goto('/admin/productos');
    await expect(page).toHaveURL(/\/cuenta/);

    // 1.2 Acceso con rol de cliente estándar
    await page.click('.demo-chip:has-text("Cliente"), .demo-chip:has-text("Client")');
    await expect(page.locator('#user-dashboard-title')).toBeVisible();

    // Intentar forzar navegación a /admin/pedidos
    await page.goto('/admin/pedidos');
    await expect(page).toHaveURL(/\/cuenta/);
    await expect(page.locator('.user-dashboard')).toBeVisible();
  });

  test('2. Ciclo de vida completo: compra online, recepción en obrador, avance de estado y sincronización con cliente', async ({
    page,
  }) => {
    // Escuchar errores en consola
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // PASO 1: Cliente añade producto a la cesta
    await page.goto('/tienda-online/producto/cafe-100-robusta');
    await page.locator('.product-detail-button').click();
    await expect(page.locator('.cart-count')).toHaveText('1');

    // PASO 2: Cliente tramita el pedido en el checkout
    await page.goto('/preparar-pedido');
    await expect(page.locator('.checkout-page')).toBeVisible();

    await page.fill('input[name="name"]', 'Jaume Sardà');
    await page.fill('input[name="email"]', 'cliente@calsarda.com');
    await page.fill('input[name="phone"]', '633 456 789');

    // Modalidad recogida en tienda (pickup)
    await page.click('label.fulfillment-choice:has(input[value="pickup"])');

    // Pago por Bizum instantáneo
    await page.click('label.payment-choice:has(input[value="bizum"])');
    await page.fill('input[name="bizumPhone"]', '633456789');

    // Preparar vista previa
    await page.click('.checkout-submit:has-text("PREPARAR VISTA PREVIA")');
    await expect(page.locator('.order-preview')).toBeVisible();

    // Confirmar pedido
    await page.click('.confirm-order-btn');

    // Pantalla de confirmación
    await expect(page.locator('.confirmation-container')).toBeVisible();
    const referenceElement = page.locator('.reference-code');
    await expect(referenceElement).toBeVisible();
    const orderRef = (await referenceElement.innerText()).trim();
    expect(orderRef).toMatch(/^CS-\d{4}-\d+$/);

    // Comprobar distintivo de pago confirmado
    await expect(page.locator('.payment-confirmed-badge')).toBeVisible();

    // Probar botón de imprimir recibo sin errores
    const printBtn = page.locator('.action-btn.print-btn');
    await expect(printBtn).toBeVisible();
    await printBtn.click();

    // PASO 3: Transición SPA a /cuenta y acceso como Administrador
    await page.locator('a.account-button').click();
    await expect(page.locator('.login-card')).toBeVisible();

    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    // Navegar al panel de administración vía SPA
    await page.click('.admin-cta-link');
    await expect(page.locator('.admin-app')).toBeVisible();

    // Navegar a Pedidos vía sidebar SPA
    await page.click('.sidebar-nav a[href="/admin/pedidos"]');
    await expect(page.locator('.admin-orders-page')).toBeVisible();

    // Localizar el nuevo pedido creado en la tabla mediante el buscador reactivo
    const searchInput = page.locator('.search-input');
    await searchInput.fill(orderRef);
    const orderRow = page
      .locator('.orders-table tbody tr', { hasText: orderRef })
      .filter({ hasText: 'Jaume Sardà' });
    await expect(orderRow).toBeVisible();
    await expect(orderRow).toContainText('Jaume Sardà');

    // Abrir detalle del pedido
    await orderRow.locator('.ref-button').click();
    const modal = page.locator('.order-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#modal-order-title')).toContainText(orderRef);
    await expect(modal).toContainText('Jaume Sardà');

    // Avanzar a 'listo_recogida'
    const readyBtn = modal.locator('.btn-modal-action.btn-ready');
    if (await readyBtn.isVisible()) {
      await readyBtn.click();
    } else {
      const prepBtn = modal.locator('.btn-modal-action.btn-prep');
      if (await prepBtn.isVisible()) {
        await prepBtn.click();
      }
      await modal.locator('.btn-modal-action.btn-ready').click();
    }

    // Verificar actualización del badge en modal
    await expect(modal.locator('.status-badge')).toContainText(/recogida|recollida|listo/i);

    // Cerrar modal
    await modal.locator('.modal-close-btn').click();
    await expect(modal).not.toBeVisible();

    // PASO 4: Transición SPA para que el cliente verifique sincronización en /cuenta
    await page.click('.topbar-signout-btn');
    await expect(page.locator('.login-card')).toBeVisible();

    // Iniciar sesión como Cliente
    await page.click('.demo-chip:has-text("Cliente"), .demo-chip:has-text("Client")');
    await expect(page.locator('#user-dashboard-title')).toContainText('Jaume Sardà');

    // Comprobar que en Mis Pedidos aparece el encargo creado con su estado sincronizado
    const customerOrderCard = page.locator('.customer-order-card', { hasText: orderRef }).first();
    await expect(customerOrderCard).toBeVisible();
    await expect(customerOrderCard.locator('.status-badge')).toContainText(
      /listo_recogida|recogida/i,
    );

    // Comprobar línea de tiempo con pasos activos (paso 1, 2 y 3 activos)
    const steps = customerOrderCard.locator('.timeline-step');
    await expect(steps).toHaveCount(4);
    await expect(steps.nth(0)).toHaveClass(/step-active/);
    await expect(steps.nth(1)).toHaveClass(/step-active/);
    await expect(steps.nth(2)).toHaveClass(/step-active/);

    // Probar descarga de factura simplificada
    const invoiceBtn = customerOrderCard.locator('.btn-invoice');
    await expect(invoiceBtn).toBeVisible();
    await invoiceBtn.click();

    // Probar repetición de encargo
    const reorderBtn = customerOrderCard.locator('.btn-reorder');
    await expect(reorderBtn).toBeVisible();
    await reorderBtn.click();

    // Verificar toast y actualización de cesta
    await expect(page.locator('.account-toast')).toBeVisible();

    // Comprobar que no hubo errores críticos no controlados en la consola
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('print'),
    );
    expect(criticalErrors.length).toBe(0);
  });
});
