import { test, expect } from '@playwright/test';

test.describe('Gestión de Pedidos en Backoffice (Issue #41)', () => {
  test.beforeEach(async ({ page }) => {
    // Iniciar sesión como administrador antes de cada test
    await page.goto('/cuenta');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    // Navegar a la sección de pedidos del backoffice
    await page.goto('/admin/pedidos');
    await expect(page.locator('.admin-orders-page')).toBeVisible();
  });

  test('1. Visualiza la tabla de pedidos, filtros y métricas operacionales', async ({ page }) => {
    // Comprobar título y cabecera
    await expect(page.locator('.orders-title')).toBeVisible();
    await expect(page.locator('.orders-title')).toContainText(
      /Gestión de Pedidos|Gestió de Comandes/,
    );

    // Comprobar presencia de la barra de búsqueda y selector de modalidad
    await expect(page.locator('.search-input')).toBeVisible();
    await expect(page.locator('.fulfillment-select')).toBeVisible();

    // Comprobar píldoras de estado con sus contadores
    const statusPills = page.locator('.status-pill');
    await expect(statusPills).toHaveCount(7);
    await expect(statusPills.first()).toHaveClass(/active/);

    // Comprobar tabla de pedidos cargada con filas
    const rows = page.locator('.orders-table tbody tr');
    await expect(rows).not.toHaveCount(0);
    await expect(page.locator('.orders-table')).toContainText('CS-2026-1042');
  });

  test('2. Filtra pedidos por estado operacional y por modalidad de entrega', async ({ page }) => {
    // Filtrar por 'En preparación'
    await page.click('.status-pill.pill-prep');
    await expect(page.locator('.status-pill.pill-prep')).toHaveClass(/active/);

    const rows = page.locator('.orders-table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('.status-badge')).toContainText(
        /En preparación|En preparació/,
      );
    }

    // Filtrar por modalidad 'Recogida en tienda'
    await page.selectOption('.fulfillment-select', 'pickup');
    const pickupRows = page.locator('.orders-table tbody tr');
    const pickupCount = await pickupRows.count();
    for (let i = 0; i < pickupCount; i++) {
      await expect(pickupRows.nth(i).locator('.fulfillment-tag')).toContainText(
        /Recogida|Recollida/,
      );
    }

    // Restablecer filtros
    await page.click('.status-pill:has-text("Todos"), .status-pill:has-text("Tots")');
    await page.selectOption('.fulfillment-select', 'todos');
  });

  test('3. Búsqueda reactiva por código de referencia y cliente', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();

    // Buscar por referencia específica
    await searchInput.fill('CS-2026-1041');
    await expect(searchInput).toHaveValue('CS-2026-1041');
    await expect(page.locator('.orders-table tbody tr')).toHaveCount(1);
    await expect(page.locator('.orders-table')).toContainText('Jaume Sardà');

    // Limpiar búsqueda con el botón de limpiar
    await page.click('.search-clear-btn');
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('.orders-table tbody tr')).not.toHaveCount(1);

    // Buscar por cliente
    await searchInput.fill('Montserrat');
    await expect(searchInput).toHaveValue('Montserrat');
    await expect(page.locator('.orders-table tbody tr')).toHaveCount(1);
    await expect(page.locator('.orders-table')).toContainText('CS-2026-1042');
  });

  test('4. Abre el modal de detalle del encargo y muestra desglose completo', async ({ page }) => {
    // Hacer clic en la referencia del primer pedido
    await page.click('.ref-button:has-text("CS-2026-1042")');

    // Comprobar que el modal se abre
    const modal = page.locator('.order-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#modal-order-title')).toContainText('CS-2026-1042');
    await expect(modal).toContainText('Montserrat Puig');
    await expect(modal).toContainText('612 345 678');

    // Comprobar tabla de productos desglosada
    const itemRows = modal.locator('.modal-items-table tbody tr');
    await expect(itemRows).not.toHaveCount(0);
    await expect(modal.locator('.modal-items-table')).toContainText('Pa de Pagès');

    // Comprobar notas del cliente
    await expect(modal.locator('.modal-notes-card')).toContainText('rebanadas gruesas');

    // Cerrar el modal con el botón de cierre
    await modal.locator('.modal-close-btn').click();
    await expect(modal).not.toBeVisible();
  });

  test('5. Avanza el estado del pedido y actualiza la interfaz reactivamente', async ({ page }) => {
    // Filtrar pedidos recibidos
    await page.click('.status-pill.pill-received');
    const orderRow = page.locator('.orders-table tbody tr:has-text("CS-2026-1040")');
    await expect(orderRow).toBeVisible();
    await expect(orderRow.locator('.status-badge')).toContainText(/Recibido|Rebut/);

    // Hacer clic en el botón de avance rápido "Pasar a preparación"
    const advanceBtn = orderRow.locator('.btn-advance');
    await expect(advanceBtn).toContainText(/preparación|preparació/i);
    await advanceBtn.click();

    // Comprobar que cambia de estado y desaparece de la vista filtrada de "recibidos"
    await expect(orderRow).not.toBeVisible();

    // Ir a la vista de "En preparación" y comprobar que ahora está ahí
    await page.click('.status-pill.pill-prep');
    const movedRow = page.locator('.orders-table tbody tr:has-text("CS-2026-1040")');
    await expect(movedRow).toBeVisible();
    await expect(movedRow.locator('.status-badge')).toContainText(/En preparación|En preparació/);
  });
});
