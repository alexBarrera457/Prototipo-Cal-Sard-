import { test, expect } from '@playwright/test';

test.describe('Gestión de Catálogo y Stock en Backoffice (Issue #42)', () => {
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

    // Navegar al catálogo del backoffice
    await page.goto('/admin/productos');
    await expect(page.locator('.admin-catalog')).toBeVisible();
  });

  test('1. Visualiza KPIs de catálogo, buscador, filtros y tabla de productos', async ({
    page,
  }) => {
    // Comprobar título de la sección
    await expect(page.locator('#catalog-title')).toBeVisible();
    await expect(page.locator('#catalog-title')).toContainText(
      /Gestión de Catálogo|Gestió de Catàleg/,
    );

    // Comprobar tarjetas KPI
    const kpiCards = page.locator('.kpi-card');
    await expect(kpiCards).toHaveCount(4);
    await expect(page.locator('.kpi-label').first()).toContainText('Total Productos');

    // Comprobar buscador y controles de filtro
    await expect(page.locator('.search-input')).toBeVisible();
    await expect(page.locator('.filter-select').first()).toBeVisible();

    // Comprobar presencia de filas en la tabla
    const rows = page.locator('.catalog-table tbody tr');
    await expect(rows).not.toHaveCount(0);
  });

  test('2. Filtra productos en tiempo real mediante búsqueda de texto y selector de categoría', async ({
    page,
  }) => {
    // Búsqueda por número
    await page.fill('.search-input', '01');
    const rows = page.locator('.catalog-table tbody tr');
    await expect(rows.first()).toContainText('#01');

    // Limpiar búsqueda
    await page.click('.clear-search-btn');
    await expect(page.locator('.search-input')).toHaveValue('');

    // Filtrar por categoría 'CONSERVAS DE MAR'
    await page.selectOption('.filter-select >> nth=0', 'CONSERVAS DE MAR');
    const catRows = page.locator('.catalog-table tbody tr');
    const count = await catRows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(catRows.nth(i).locator('.category-badge')).toContainText(
        /Conservas de mar|Conserves de mar/,
      );
    }
  });

  test('3. Permite alternar disponibilidad de stock directamente mediante el toggle', async ({
    page,
  }) => {
    const firstRow = page.locator('.catalog-table tbody tr').first();
    const stockBtn = firstRow.locator('.stock-toggle-btn');
    await expect(stockBtn).toBeVisible();

    // Estado inicial: En stock (Disponible)
    const initialText = await stockBtn.textContent();
    expect(initialText).toMatch(/Disponible|Agotado|Esgotat/);

    // Clic en el toggle para alternar estado
    await stockBtn.click();

    // Debe mostrar toast de confirmación
    await expect(page.locator('.catalog-toast')).toBeVisible();

    // Clic de nuevo para restaurar
    await stockBtn.click();
    await expect(page.locator('.catalog-toast')).toBeVisible();
  });

  test('4. Permite alternar producto destacado en portada directamente mediante el toggle', async ({
    page,
  }) => {
    const firstRow = page.locator('.catalog-table tbody tr').first();
    const featuredBtn = firstRow.locator('.featured-toggle-btn');
    await expect(featuredBtn).toBeVisible();

    // Alternar destacado
    await featuredBtn.click();
    await expect(page.locator('.catalog-toast')).toBeVisible();

    // Restaurar
    await featuredBtn.click();
    await expect(page.locator('.catalog-toast')).toBeVisible();
  });

  test('5. Abre el modal de edición, modifica datos del producto y guarda cambios', async ({
    page,
  }) => {
    const firstRow = page.locator('.catalog-table tbody tr').first();
    const editBtn = firstRow.locator('.btn-edit-product');
    await editBtn.click();

    // Verificar apertura del modal
    const modal = page.locator('.edit-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#edit-dialog-title')).toContainText(
      /Editar Producto|Editar Producte/,
    );

    // Modificar precio y alérgenos
    await modal.locator('#edit-price').fill('29.95');
    await modal.locator('#edit-allergens').fill('Gluten, Frutos secos');

    // Guardar cambios
    await modal.locator('.btn-submit').click();

    // Modal debe cerrarse y mostrar toast de éxito
    await expect(modal).not.toBeVisible();
    await expect(page.locator('.catalog-toast')).toBeVisible();
    await expect(page.locator('.catalog-toast')).toContainText(
      /actualizado con éxito|actualitzat amb èxit/,
    );

    // El nuevo precio debe verse en la fila
    await expect(firstRow.locator('.price-val')).toContainText('29,95');
  });
});
