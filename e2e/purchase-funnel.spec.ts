import { test, expect } from '@playwright/test';

test.describe('Funnel de compra completo de Cal Sardà', () => {
  test.beforeEach(async ({ page }) => {
    // Limpiar localStorage antes de cada prueba para estado limpio
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. Explorar el catálogo, buscar o filtrar café y abrir la ficha de producto con detalles', async ({
    page,
  }) => {
    // Navegar a la tienda online
    await page.goto('/tienda-online');
    await expect(page).toHaveTitle(/Tienda online/i);

    // Filtrar por categoría "Café gourmet"
    const cafeCategoryBtn = page.locator('.store-categories button', { hasText: /café/i });
    await expect(cafeCategoryBtn).toBeVisible();
    await cafeCategoryBtn.click();

    // Esperar a que el listado muestre productos filtrados
    const products = page.locator('article.store-product');
    await expect(products.first()).toBeVisible();

    // Comprobar el nombre del primer producto
    const firstTitle = await products.first().locator('h3').textContent();
    expect(firstTitle?.toLowerCase()).toContain('café');

    // Abrir la ficha del producto haciendo clic en su enlace de ver producto
    await products.first().locator('a.store-product-overlay').click();

    // Verificar que estamos en la URL semántica del producto
    await expect(page).toHaveURL(/\/tienda-online\/producto\/.+/);

    // Verificar elementos clave de la ficha de detalle
    await expect(page.locator('.product-detail h1')).toBeVisible();
    await expect(page.locator('.product-detail-price')).toBeVisible();
    await expect(page.locator('.product-detail-button')).toBeVisible();

    // Comprobar también el buscador reactivo de la cabecera
    const headerSearch = page.locator('.header-search input[type="search"]');
    await expect(headerSearch).toBeVisible();
    await headerSearch.fill('conservas');
    const searchDropdown = page.locator('#header-search-results');
    await expect(searchDropdown).toBeVisible();
  });

  test('2. Añadir producto a la cesta, ajustar cantidades y verificar actualización en Navbar', async ({
    page,
  }) => {
    // Navegar a la ficha directa de un producto (Café 100% Robusta)
    await page.goto('/tienda-online/producto/cafe-100-robusta');
    await expect(page.locator('.product-detail h1')).toContainText('Café 100% Robusta');

    // Incrementar cantidad a 2 unidades antes de añadir
    const increaseBtn = page.locator('.quantity button', { hasText: '+' });
    await increaseBtn.click();
    await expect(page.locator('.quantity span')).toHaveText('2');

    // Añadir a la cesta
    const addToCartBtn = page.locator('.product-detail-button');
    await addToCartBtn.click();

    // Verificar que el contador del Navbar refleja las 2 unidades añadidas
    const cartCount = page.locator('.cart-count');
    await expect(cartCount).toHaveText('2');

    // Abrir el panel lateral de la cesta
    const openCartBtn = page.locator('button.navbar-cart');
    await openCartBtn.click();

    // Verificar que el panel contiene el producto
    const cartPanel = page.locator('#cart-panel');
    await expect(cartPanel).toBeVisible();
    await expect(cartPanel.locator('.cart-product h3')).toContainText('Café 100% Robusta');

    // Ajustar cantidad dentro del panel (+1 para ser 3)
    const panelIncreaseBtn = cartPanel.locator('.cart-product-actions button', { hasText: '+' });
    await panelIncreaseBtn.click();
    await expect(cartCount).toHaveText('3');
  });

  test('3. Navegar a la pantalla de compra, rellenar datos y verificar vista previa del pedido', async ({
    page,
  }) => {
    // Navegar y añadir un producto a la cesta
    await page.goto('/tienda-online/producto/cafe-100-robusta');
    await page.locator('.product-detail-button').click();
    await expect(page.locator('.cart-count')).toHaveText('1');

    // Abrir la cesta y tramitar encargo
    await page.locator('button.navbar-cart').click();
    const checkoutLink = page.locator('.cart-checkout');
    await expect(checkoutLink).toBeVisible();
    await checkoutLink.click();

    // Verificar navegación a la página de compra
    await expect(page).toHaveURL(/preparar-pedido/);
    await expect(page).toHaveTitle(/Preparar pedido/i);

    // Verificar que el resumen muestra el producto
    const summaryProduct = page.locator('.summary-product');
    await expect(summaryProduct.first()).toBeVisible();
    await expect(summaryProduct.first()).toContainText('Café 100% Robusta');

    // Rellenar formulario de datos de cliente
    await page.locator('input[name="name"]').fill('Marta Garcia');
    await page.locator('input[name="email"]').fill('marta.garcia@ejemplo.com');
    await page.locator('input[name="phone"]').fill('612345678');

    // Seleccionar recogida en tienda (gratuita)
    await page.locator('input[name="fulfillment"][value="pickup"]').check();

    // Enviar el formulario para generar la vista previa
    const reviewBtn = page.locator('button[type="submit"]', {
      hasText: /PREPARAR VISTA PREVIA/i,
    });
    await reviewBtn.click();

    // Verificar que se muestra la vista previa con los datos del encargo
    const previewPanel = page.locator('.order-preview');
    await expect(previewPanel).toBeVisible();
    await expect(previewPanel.locator('h2')).toContainText('Marta Garcia');
    await expect(previewPanel).toContainText('marta.garcia@ejemplo.com');
    await expect(previewPanel).toContainText('612345678');
    await expect(previewPanel).toContainText('recogida en tienda');
  });
});
