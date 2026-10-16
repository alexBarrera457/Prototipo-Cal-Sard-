import { test, expect } from '@playwright/test';

test.describe('Gestión y ficha de clientes Mini-CRM (#52)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('permite visualizar clientes, filtrar por recurrencia y editar ficha con notas de obrador', async ({
    page,
  }) => {
    // 1. Iniciar sesión como administrador
    await page.goto('/cuenta');
    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    // 2. Navegar a /admin/clientes desde la barra lateral
    await page.goto('/admin');
    const customersNavLink = page.locator('aside.admin-sidebar a[href*="clientes"]');
    await expect(customersNavLink).toBeVisible();
    await customersNavLink.click();
    await expect(page).toHaveURL(/\/admin\/clientes/);

    // 3. Verificar KPIs principales del Mini-CRM
    await expect(page.locator('#kpi-total-customers')).toBeVisible();
    await expect(page.locator('#kpi-recurrent-customers')).toBeVisible();
    await expect(page.locator('#kpi-total-ltv')).toBeVisible();

    // 4. Verificar que aparecen clientes en la tabla (ej. Montserrat Puig o Jaume Sardà)
    await expect(page.locator('.customer-name:has-text("Montserrat Puig")')).toBeVisible();
    await expect(page.locator('.customer-name:has-text("Jaume Sardà")')).toBeVisible();

    // 5. Filtrar por buscador
    const searchInput = page.locator('#search-customers-input');
    await searchInput.fill('Montserrat');
    await expect(page.locator('.customer-name')).toHaveCount(1);
    await expect(page.locator('.customer-name')).toHaveText('Montserrat Puig');

    // Limpiar búsqueda
    await page.click('.search-clear-btn');
    await expect(page.locator('.customer-row')).toHaveCount(5);

    // 6. Filtrar por clientes recurrentes
    await page.click('.filter-pill:has-text("Recurrentes")');
    await expect(page.locator('.customer-name:has-text("Jaume Sardà")')).toBeVisible();
    await expect(page.locator('.customer-name:has-text("Montserrat Puig")')).not.toBeVisible();

    // Volver a todos
    await page.locator('.filter-pills button:has-text("Todos")').first().click();

    // 7. Abrir la ficha detallada de Jaume Sardà
    const detailBtn = page.locator('.btn-open-detail').first();
    await detailBtn.click();

    // Verificar modal abierto
    const modal = page.locator('.customer-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.order-history-item')).toHaveCount(3); // Tiene 3 pedidos iniciales

    // 8. Modificar notas internas de obrador y tipo de cliente
    const notesInput = modal.locator('#cust-notes-input');
    await notesInput.fill('Prefiere jamón ibérico de bellota en lonchas finas.');

    const typeSelect = modal.locator('#cust-type-select');
    await typeSelect.selectOption('empresa');

    await modal.locator('#btn-save-customer-notes').click();

    // 9. Verificar toast de confirmación y persistencia
    const toast = page.locator('.customers-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/actualizada/i);

    // Cerrar modal
    await modal.locator('#btn-close-customer-modal').click();
    await expect(modal).not.toBeVisible();

    // Verificar que en la tabla ahora muestra el badge de Empresa
    await expect(page.locator('.type-empresa')).toBeVisible();
  });
});
