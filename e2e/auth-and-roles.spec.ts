import { test, expect } from '@playwright/test';

test.describe('Autenticación y Control de Roles (Issue #39)', () => {
  test.beforeEach(async ({ page }) => {
    // Limpiar almacenamiento previo para asegurar estado limpio
    await page.goto('/cuenta');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('1. Muestra el formulario de inicio de sesión con campos requeridos y accesos rápidos', async ({
    page,
  }) => {
    await page.goto('/cuenta');

    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    const submitBtn = page.locator('.login-card form button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Comprobar presencia de accesos rápidos de prueba
    await expect(page.locator('.demo-buttons')).toBeVisible();
    await expect(page.locator('.demo-chip').first()).toBeVisible();
  });

  test('2. Inicio de sesión como cliente, persistencia de perfil y cierre de sesión', async ({
    page,
  }) => {
    await page.goto('/cuenta');

    await page.fill('#login-email', 'cliente@calsarda.com');
    await page.fill('#login-password', 'cliente1930');
    await page.click('.login-card form button[type="submit"]');

    // Comprobar dashboard del cliente
    const dashboard = page.locator('.user-dashboard');
    await expect(dashboard).toBeVisible();
    await expect(dashboard).toContainText('Jaume Sardà');
    await expect(dashboard).toContainText('cliente@calsarda.com');
    await expect(dashboard.locator('.user-role-badge')).toContainText(/Cliente|Client/);

    // Comprobar actualización reactiva en la Navbar
    const navbarAccount = page.locator('.account-button');
    await expect(navbarAccount).toContainText('Jaume');

    // Cerrar sesión
    await page.click('.sign-out-button');
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(navbarAccount).toContainText(/Mi cuenta|El meu compte/);
  });

  test('3. Inicio de sesión como administrador y visualización del panel administrativo', async ({
    page,
  }) => {
    await page.goto('/cuenta');

    // Usar acceso rápido de admin
    await page.click('.demo-chip:has-text("Admin")');

    // Comprobar estado de administrador
    const dashboard = page.locator('.user-dashboard');
    await expect(dashboard).toBeVisible();
    await expect(dashboard).toContainText('Administrador Cal Sardà');
    await expect(dashboard.locator('.badge-admin')).toBeVisible();

    // CTA para ir al panel de administración
    const adminCta = page.locator('.admin-cta-card');
    await expect(adminCta).toBeVisible();
    await expect(adminCta.locator('.admin-cta-link')).toBeVisible();
  });

  test('4. Registro de nuevo usuario en /crear-cuenta y sesión iniciada', async ({ page }) => {
    await page.goto('/crear-cuenta');

    const uniqueEmail = `test.${Date.now()}@calsarda.cat`;
    await page.fill('#account-name', 'Montserrat Puig');
    await page.fill('#account-email', uniqueEmail);
    await page.fill('#account-password', 'ClaveSegura1930!');
    await page.fill('#account-confirm-password', 'ClaveSegura1930!');
    await page.check('#account-privacy');

    const submitBtn = page.locator('.form-card form button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Comprobar mensaje de éxito y enlace al cuenta
    const successMsg = page.locator('.success-message');
    await expect(successMsg).toBeVisible();
    await expect(successMsg).toContainText(/creada|creat/i);

    // Navegar al cuenta y comprobar sesión activa
    await page.click('.success-actions a');
    await expect(page).toHaveURL(/\/cuenta/);
    await expect(page.locator('.user-dashboard')).toContainText('Montserrat Puig');
  });
});
