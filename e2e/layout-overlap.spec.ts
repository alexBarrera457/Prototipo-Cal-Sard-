import { test, expect } from '@playwright/test';

test.describe('Validación de layout y no-solapamiento del header fijo (Issue #37)', () => {
  test('1. En /blog, el encabezado y antetítulo deben posicionarse debajo de la barra fija', async ({
    page,
  }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');

    const navbar = page.locator('.navbar');
    const blogKicker = page.locator('.blog-kicker');
    const blogTitle = page.locator('.blog-title');

    await expect(navbar).toBeVisible();
    await expect(blogKicker).toBeVisible();
    await expect(blogTitle).toBeVisible();

    const navBox = await navbar.boundingBox();
    const kickerBox = await blogKicker.boundingBox();

    expect(navBox).not.toBeNull();
    expect(kickerBox).not.toBeNull();
    // La parte superior del contenido debe estar por debajo del límite inferior del navbar
    expect(kickerBox!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height);
  });

  test('2. En /blog/:slug, las migas de pan (breadcrumbs) deben ser visibles y clickables bajo el header', async ({
    page,
  }) => {
    await page.goto('/blog/el-arte-del-cafe-tostado-artesanal');
    await page.waitForLoadState('networkidle');

    const navbar = page.locator('.navbar');
    const breadcrumbNav = page.locator('.breadcrumb-nav');

    await expect(navbar).toBeVisible();
    await expect(breadcrumbNav).toBeVisible();

    const navBox = await navbar.boundingBox();
    const breadcrumbBox = await breadcrumbNav.boundingBox();

    expect(navBox).not.toBeNull();
    expect(breadcrumbBox).not.toBeNull();
    expect(breadcrumbBox!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height);
  });

  test('3. En ficha de producto individual, el botón de volver y badge numérico no deben quedar solapados', async ({
    page,
  }) => {
    await page.goto('/tienda-online/producto/cafe-100-robusta');
    await page.waitForLoadState('networkidle');

    const navbar = page.locator('.navbar');
    const backBtn = page.locator('.product-detail-back');

    await expect(navbar).toBeVisible();
    await expect(backBtn).toBeVisible();

    const navBox = await navbar.boundingBox();
    const backBtnBox = await backBtn.boundingBox();

    expect(navBox).not.toBeNull();
    expect(backBtnBox).not.toBeNull();
    expect(backBtnBox!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height);
  });

  test('4. En /historia, el encabezado debe librar el header en escritorio y en vista móvil', async ({
    page,
  }) => {
    // Vista escritorio
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/historia');
    await page.waitForLoadState('networkidle');

    const navbar = page.locator('.navbar');
    const brandHeader = page.locator('.brand-page-header');

    await expect(navbar).toBeVisible();
    await expect(brandHeader).toBeVisible();

    let navBox = await navbar.boundingBox();
    let headerBox = await brandHeader.boundingBox();

    expect(headerBox!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height);

    // Vista móvil
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    navBox = await navbar.boundingBox();
    headerBox = await brandHeader.boundingBox();

    expect(headerBox!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height);
  });
});
