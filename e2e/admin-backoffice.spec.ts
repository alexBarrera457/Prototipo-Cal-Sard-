import { test, expect } from '@playwright/test';

test.describe('Backoffice y Protección de Ruta AdminGuard (Issue #40)', () => {
  test.beforeEach(async ({ page }) => {
    // Limpiar almacenamiento previo para asegurar estado limpio
    await page.goto('/cuenta');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('1. Bloquea acceso anónimo a /admin y redirige a /cuenta', async ({ page }) => {
    await page.goto('/admin');

    // Debe ser interceptado por adminGuard y redirigido a /cuenta
    await expect(page).toHaveURL(/\/cuenta.*returnUrl=%2Fadmin/);
    await expect(page.locator('#login-email')).toBeVisible();
  });

  test('2. Bloquea acceso a clientes comunes sin permisos de administrador', async ({ page }) => {
    // Iniciar sesión como cliente estándar
    await page.goto('/cuenta');
    await page.click('.demo-chip:has-text("Cliente")');
    await expect(page.locator('.user-dashboard')).toBeVisible();
    await expect(page.locator('.user-role-badge')).toContainText(/Cliente|Client/);

    // Intentar acceder directamente a /admin
    await page.goto('/admin');

    // adminGuard debe bloquearlo y redirigirlo a /cuenta con motivo de acceso restringido
    await expect(page).toHaveURL(/\/cuenta.*motivo=acceso_restringido/);
    await expect(page.locator('.user-dashboard')).toBeVisible();
  });

  test('3. Permite acceso a administrador y carga el layout dedicado del Backoffice', async ({
    page,
  }) => {
    await page.goto('/cuenta');

    // Iniciar sesión como admin mediante chip rápido
    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    // Navegar a /admin haciendo clic en el enlace del dashboard
    await page.click('.admin-cta-link');
    await expect(page).toHaveURL(/\/admin/);

    // Comprobar presencia del layout administrativo
    const topbar = page.locator('.admin-topbar');
    await expect(topbar).toBeVisible();
    await expect(topbar).toContainText('CAL SARDÀ');
    await expect(topbar.locator('.admin-pill')).toBeVisible();
    await expect(topbar.locator('.admin-user-name')).toContainText('Administrador Cal Sardà');

    // Comprobar enlace para volver a la tienda web
    const storeLink = topbar.locator('.view-store-link');
    await expect(storeLink).toBeVisible();

    // Comprobar barra lateral (Sidebar)
    const sidebar = page.locator('.admin-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('.sidebar-nav-item')).toHaveCount(7);

    // Comprobar que el header y footer públicos de clientes no se solapan
    await expect(page.locator('app-navbar')).toHaveCount(0);
    await expect(page.locator('app-footer')).toHaveCount(0);

    // Comprobar contenido del Dashboard
    await expect(page.locator('#dashboard-title')).toBeVisible();
    await expect(page.locator('.kpi-card')).toHaveCount(4);
    await expect(page.locator('.recent-orders-section')).toContainText('CS-2026-1042');
  });

  test('4. Cierre de sesión desde la barra superior de administración', async ({ page }) => {
    await page.goto('/cuenta');
    await page.click('.demo-chip:has-text("Admin")');
    await expect(page.locator('.badge-admin')).toBeVisible();

    await page.goto('/admin');
    await expect(page.locator('.admin-topbar')).toBeVisible();

    // Cerrar sesión
    await page.click('.topbar-signout-btn');
    await expect(page).toHaveURL(/\/cuenta/);

    // Intentar volver a /admin debe ser bloqueado
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/cuenta.*returnUrl=%2Fadmin/);
  });
});
