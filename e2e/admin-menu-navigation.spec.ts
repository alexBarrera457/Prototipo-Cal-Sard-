import { test, expect } from '@playwright/test';

test.describe('Navegación Completa del Menú de Administración: Facturación y Ajustes', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Iniciar sesión como administrador mediante la demo de cuentas
    await page.goto('/cuenta');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    // 2. Entrar al panel de administración
    await page.click('.admin-cta-link');
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('.admin-sidebar')).toBeVisible();
  });

  test('1. Sidebar contiene los 5 enlaces operativos y navega a Facturación (/admin/facturacion)', async ({
    page,
  }) => {
    const sidebar = page.locator('.admin-sidebar');

    // Verificar que los 5 enlaces están presentes en el menú lateral
    await expect(sidebar.locator('a[href="/admin"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/admin/pedidos"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/admin/productos"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/admin/facturacion"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/admin/ajustes"]')).toBeVisible();

    // Navegar a Facturación haciendo clic en la barra lateral
    await sidebar.locator('a[href="/admin/facturacion"]').click();
    await expect(page).toHaveURL(/\/admin\/facturacion/);

    // Verificar cabecera y título
    await expect(page.locator('#invoicing-title')).toContainText(/Facturación|Facturació/);

    // Verificar tarjetas KPI
    const kpiCards = page.locator('.kpi-card');
    await expect(kpiCards).toHaveCount(4);
    await expect(kpiCards.first()).toBeVisible();

    // Verificar desglose por tipo de IVA (4%, 10%, 21%)
    const vatCards = page.locator('.vat-card');
    await expect(vatCards).toHaveCount(3);
    await expect(page.locator('.vat-badge.vat-4')).toContainText('4%');
    await expect(page.locator('.vat-badge.vat-10')).toContainText('10%');
    await expect(page.locator('.vat-badge.vat-21')).toContainText('21%');

    // Verificar tabla de facturas emitidas
    const rows = page.locator('.invoicing-table tbody tr.invoice-row');
    await expect(rows.first()).toBeVisible();
    await expect(rows).toHaveCount(7);

    // Abrir modal de vista previa de una factura
    await rows.first().locator('.view-btn').click();
    const modal = page.locator('.modal-dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('B-08193026');
    await expect(modal.locator('.modal-title')).toContainText('FS-');

    // Cerrar modal
    await modal.locator('.modal-close-btn').click();
    await expect(page.locator('.modal-dialog')).not.toBeVisible();
  });

  test('2. Filtra facturas y permite descarga del libro fiscal CSV', async ({ page }) => {
    await page.locator('.admin-sidebar a[href="/admin/facturacion"]').click();
    await expect(page).toHaveURL(/\/admin\/facturacion/);

    // Búsqueda por cliente
    const searchInput = page.locator('.search-input');
    await searchInput.fill('Montserrat');
    const filteredRows = page.locator('.invoicing-table tbody tr.invoice-row');
    await expect(filteredRows).toHaveCount(1);
    await expect(filteredRows.first()).toContainText('Montserrat Puig');

    // Limpiar búsqueda
    await page.locator('.clear-search-btn').click();
    await expect(filteredRows).toHaveCount(7);

    // Comprobar presencia del botón de exportar CSV
    const exportBtn = page.locator('.btn-export-csv');
    await expect(exportBtn).toBeVisible();
  });

  test('3. Navega a Ajustes (/admin/ajustes), modifica parámetros del obrador y guarda reactivamente', async ({
    page,
  }) => {
    const sidebar = page.locator('.admin-sidebar');
    await sidebar.locator('a[href="/admin/ajustes"]').click();
    await expect(page).toHaveURL(/\/admin\/ajustes/);

    // Verificar cabecera y título
    await expect(page.locator('#settings-title')).toContainText(/Ajustes|Ajustos/);

    // Verificar que existen las 4 tarjetas de configuración
    const settingsCards = page.locator('.settings-card');
    await expect(settingsCards).toHaveCount(4);

    // Comprobar valores por defecto en datos fiscales
    const legalNameInput = page.locator('#legalName');
    await expect(legalNameInput).toHaveValue('Cal Sardà Obrador Gastronòmic S.L.');
    const cifInput = page.locator('#cif');
    await expect(cifInput).toHaveValue('B-08193026');

    // Modificar teléfono de atención
    const phoneInput = page.locator('#phone');
    await phoneInput.fill('+34 93 777 88 99');

    // Modificar umbral de envío gratuito
    const freeShippingInput = page.locator('#freeShippingThreshold');
    await freeShippingInput.fill('65');

    // Guardar cambios
    await page.locator('.settings-bottom-bar .btn-save-main').click();

    // Verificar que aparece el mensaje toast de confirmación
    const toast = page.locator('.settings-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/guardados|desats/i);

    // Restablecer valores predeterminados
    await page.locator('.btn-reset').click();
    await expect(page.locator('.settings-toast')).toBeVisible();
    await expect(phoneInput).toHaveValue('+34 93 245 67 89');
    await expect(freeShippingInput).toHaveValue('80');
  });

  test('4. Tarjeta del Dashboard navega correctamente a /admin/facturacion', async ({ page }) => {
    // Desde el dashboard principal (/admin), comprobar el enlace rápido del módulo de facturación
    await page.locator('.admin-sidebar a[href="/admin"]').click();
    await expect(page).toHaveURL('/admin');

    const invoicingModuleLink = page.locator('.module-card a[href="/admin/facturacion"]');
    await expect(invoicingModuleLink).toBeVisible();
    await invoicingModuleLink.click();

    await expect(page).toHaveURL(/\/admin\/facturacion/);
    await expect(page.locator('#invoicing-title')).toBeVisible();
  });
});
