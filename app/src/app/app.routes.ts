import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Cal Sardà | Productos de siempre desde 1930',
    loadComponent: () => import('./pages/home-page/home-page').then((m) => m.HomePage),
  },
  {
    path: 'historia',
    title: 'Historia de Cal Sardà | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'historia' },
  },
  {
    path: 'tienda-online',
    title: 'Tienda online | Cal Sardà',
    loadComponent: () => import('./pages/shop-page/shop-page').then((m) => m.ShopPage),
  },
  {
    path: 'tienda-online/producto',
    redirectTo: 'tienda-online',
    pathMatch: 'full',
  },
  {
    path: 'tienda-online/producto/:slug',
    loadComponent: () => import('./pages/product-page/product-page').then((m) => m.ProductPage),
  },
  {
    path: 'preparar-pedido',
    title: 'Preparar pedido | Cal Sardà',
    loadComponent: () => import('./pages/checkout-page/checkout-page').then((m) => m.CheckoutPage),
  },
  {
    path: 'cuenta',
    title: 'Iniciar sesión | Cal Sardà',
    loadComponent: () => import('./pages/account-page/account-page').then((m) => m.AccountPage),
  },
  {
    path: 'iniciar-sesion',
    redirectTo: 'cuenta',
    pathMatch: 'full',
  },
  {
    path: 'crear-cuenta',
    title: 'Crear cuenta | Cal Sardà',
    loadComponent: () =>
      import('./pages/create-account-page/create-account-page').then((m) => m.CreateAccountPage),
  },
  {
    path: 'account/register',
    redirectTo: 'crear-cuenta',
    pathMatch: 'full',
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        title: 'Panel de Control | Cal Sardà',
        loadComponent: () =>
          import('./pages/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'pedidos',
        title: 'Gestión de Pedidos | Cal Sardà',
        loadComponent: () =>
          import('./pages/admin/admin-orders/admin-orders').then((m) => m.AdminOrders),
      },
      {
        path: 'productos',
        title: 'Gestión de Catálogo y Stock | Cal Sardà',
        loadComponent: () =>
          import('./pages/admin/admin-catalog/admin-catalog').then((m) => m.AdminCatalog),
      },
      {
        path: 'facturacion',
        title: 'Facturación y Series Fiscales | Cal Sardà',
        loadComponent: () =>
          import('./pages/admin/admin-invoicing/admin-invoicing').then((m) => m.AdminInvoicing),
      },
      {
        path: 'cupones',
        title: 'Gestión de Cupones y Promociones | Cal Sardà',
        loadComponent: () =>
          import('./pages/admin/admin-coupons/admin-coupons').then((m) => m.AdminCoupons),
      },
      {
        path: 'clientes',
        title: 'Gestión de Clientes (Mini-CRM) | Cal Sardà',
        loadComponent: () =>
          import('./pages/admin/admin-customers/admin-customers').then((m) => m.AdminCustomers),
      },
      {
        path: 'ajustes',
        title: 'Ajustes del Obrador y Tienda | Cal Sardà',
        loadComponent: () =>
          import('./pages/admin/admin-settings/admin-settings').then((m) => m.AdminSettings),
      },
    ],
  },
  {
    path: 'galeria',
    title: 'Galería | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'galeria' },
  },
  {
    path: 'contacto',
    title: 'Contacto | Cal Sardà',
    loadComponent: () => import('./pages/contact-page/contact-page').then((m) => m.ContactPage),
  },
  {
    path: 'boletin',
    title: 'Boletín | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'newsletter' },
  },
  {
    path: 'descubre-el-territorio',
    title: 'Descubre el territorio | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'descobreix-el-territori' },
  },
  {
    path: 'lotes-para-empresas',
    title: 'Lotes para empresas | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'lots-per-a-empreses' },
  },
  {
    path: 'lotes-y-cestas-gourmet',
    title: 'Lotes y cestas gourmet | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'lots-i-cistelles-gurmet' },
  },
  {
    path: 'lotes-a-medida',
    title: 'Configurador de lotes gourmet a medida | Cal Sardà',
    loadComponent: () =>
      import('./pages/custom-lots-page/custom-lots-page').then((m) => m.CustomLotsPage),
  },
  {
    path: 'tarjeta-regalo',
    title: 'Tarjeta regalo digital | Cal Sardà',
    loadComponent: () =>
      import('./pages/gift-card-page/gift-card-page').then((m) => m.GiftCardPage),
  },
  {
    path: 'faq',
    title: 'Preguntas frecuentes | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'faq' },
  },
  {
    path: 'blog',
    title: 'Blog gastronómico y recetas | Cal Sardà',
    loadComponent: () => import('./pages/blog-page/blog-page').then((m) => m.BlogPage),
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./pages/blog-detail-page/blog-detail-page').then((m) => m.BlogDetailPage),
  },
  {
    path: 'aviso-legal',
    title: 'Aviso legal | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'avis-legal' },
  },
  {
    path: 'politica-de-privacidad',
    title: 'Política de privacidad | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'politica-de-privacitat' },
  },
  {
    path: 'politica-de-cookies',
    title: 'Política de cookies | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'politica-de-cookies' },
  },
  {
    path: 'condiciones-generales',
    title: 'Condiciones generales | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'condicions-generals' },
  },
  {
    path: 'mapa-web',
    title: 'Mapa web | Cal Sardà',
    loadComponent: () => import('./pages/brand-page/brand-page').then((m) => m.BrandPage),
    data: { page: 'mapa-web' },
  },
  {
    path: 'botiga-en-linia',
    redirectTo: 'tienda-online',
    pathMatch: 'full',
  },
  {
    path: 'checkout',
    redirectTo: 'preparar-pedido',
    pathMatch: 'full',
  },
  {
    path: 'contacte',
    redirectTo: 'contacto',
    pathMatch: 'full',
  },
  {
    path: 'newsletter-184400',
    redirectTo: 'boletin',
    pathMatch: 'full',
  },
  {
    path: 'newsletter',
    redirectTo: 'boletin',
    pathMatch: 'full',
  },
  {
    path: 'descobreix-el-territori',
    redirectTo: 'descubre-el-territorio',
    pathMatch: 'full',
  },
  {
    path: 'lots-per-a-empreses',
    redirectTo: 'lotes-para-empresas',
    pathMatch: 'full',
  },
  {
    path: 'lots-i-cistelles-gurmet',
    redirectTo: 'lotes-y-cestas-gourmet',
    pathMatch: 'full',
  },
  {
    path: 'lots-a-mida',
    redirectTo: 'lotes-a-medida',
    pathMatch: 'full',
  },
  {
    path: 'avis-legal',
    redirectTo: 'aviso-legal',
    pathMatch: 'full',
  },
  {
    path: 'politica-de-privacitat',
    redirectTo: 'politica-de-privacidad',
    pathMatch: 'full',
  },
  {
    path: 'condicions-generals',
    redirectTo: 'condiciones-generales',
    pathMatch: 'full',
  },
  {
    path: 'account/login',
    redirectTo: '/cuenta',
    pathMatch: 'full',
  },
  {
    path: 'proces-de-compra/step1',
    redirectTo: 'tienda-online',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
