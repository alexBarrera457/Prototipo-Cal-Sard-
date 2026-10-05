import { Routes } from '@angular/router';

import { BrandPage } from './pages/brand-page/brand-page';
import { ContactPage } from './pages/contact-page/contact-page';
import { HomePage } from './pages/home-page/home-page';
import { ShopPage } from './pages/shop-page/shop-page';
import { CheckoutPage } from './pages/checkout-page/checkout-page';
import { AccountPage } from './pages/account-page/account-page';
import { CreateAccountPage } from './pages/create-account-page/create-account-page';

export const routes: Routes = [
  {
    path: '',
    title: 'Cal Sardà | Productos de siempre desde 1930',
    component: HomePage
  },
  {
    path: 'historia',
    title: 'Historia de Cal Sardà | Cal Sardà',
    component: BrandPage,
    data: { page: 'historia' }
  },
  {
    path: 'tienda-online',
    title: 'Tienda online | Cal Sardà',
    component: ShopPage
  },
  {
    path: 'preparar-pedido',
    title: 'Preparar pedido | Cal Sardà',
    component: CheckoutPage
  },
  {
    path: 'cuenta',
    title: 'Iniciar sesión | Cal Sardà',
    component: AccountPage
  },
  {
    path: 'iniciar-sesion',
    redirectTo: 'cuenta',
    pathMatch: 'full'
  },
  {
    path: 'crear-cuenta',
    title: 'Crear cuenta | Cal Sardà',
    component: CreateAccountPage
  },
  {
    path: 'account/register',
    redirectTo: 'crear-cuenta',
    pathMatch: 'full'
  },
  {
    path: 'galeria',
    title: 'Galería | Cal Sardà',
    component: BrandPage,
    data: { page: 'galeria' }
  },
  {
    path: 'contacto',
    title: 'Contacto | Cal Sardà',
    component: ContactPage
  },
  {
    path: 'boletin',
    title: 'Boletín | Cal Sardà',
    component: BrandPage,
    data: { page: 'newsletter' }
  },
  {
    path: 'descubre-el-territorio',
    title: 'Descubre el territorio | Cal Sardà',
    component: BrandPage,
    data: { page: 'descobreix-el-territori' }
  },
  {
    path: 'lotes-para-empresas',
    title: 'Lotes para empresas | Cal Sardà',
    component: BrandPage,
    data: { page: 'lots-per-a-empreses' }
  },
  {
    path: 'lotes-y-cestas-gourmet',
    title: 'Lotes y cestas gourmet | Cal Sardà',
    component: BrandPage,
    data: { page: 'lots-i-cistelles-gurmet' }
  },
  {
    path: 'faq',
    title: 'Preguntas frecuentes | Cal Sardà',
    component: BrandPage,
    data: { page: 'faq' }
  },
  {
    path: 'blog',
    title: 'Blog | Cal Sardà',
    component: BrandPage,
    data: { page: 'blog' }
  },
  {
    path: 'aviso-legal',
    title: 'Aviso legal | Cal Sardà',
    component: BrandPage,
    data: { page: 'avis-legal' }
  },
  {
    path: 'politica-de-privacidad',
    title: 'Política de privacidad | Cal Sardà',
    component: BrandPage,
    data: { page: 'politica-de-privacitat' }
  },
  {
    path: 'politica-de-cookies',
    title: 'Política de cookies | Cal Sardà',
    component: BrandPage,
    data: { page: 'politica-de-cookies' }
  },
  {
    path: 'condiciones-generales',
    title: 'Condiciones generales | Cal Sardà',
    component: BrandPage,
    data: { page: 'condicions-generals' }
  },
  {
    path: 'mapa-web',
    title: 'Mapa web | Cal Sardà',
    component: BrandPage,
    data: { page: 'mapa-web' }
  },
  {
    path: 'botiga-en-linia',
    redirectTo: 'tienda-online',
    pathMatch: 'full'
  },
  {
    path: 'checkout',
    redirectTo: 'preparar-pedido',
    pathMatch: 'full'
  },
  {
    path: 'contacte',
    redirectTo: 'contacto',
    pathMatch: 'full'
  },
  {
    path: 'newsletter-184400',
    redirectTo: 'boletin',
    pathMatch: 'full'
  },
  {
    path: 'newsletter',
    redirectTo: 'boletin',
    pathMatch: 'full'
  },
  {
    path: 'descobreix-el-territori',
    redirectTo: 'descubre-el-territorio',
    pathMatch: 'full'
  },
  {
    path: 'lots-per-a-empreses',
    redirectTo: 'lotes-para-empresas',
    pathMatch: 'full'
  },
  {
    path: 'lots-i-cistelles-gurmet',
    redirectTo: 'lotes-y-cestas-gourmet',
    pathMatch: 'full'
  },
  {
    path: 'avis-legal',
    redirectTo: 'aviso-legal',
    pathMatch: 'full'
  },
  {
    path: 'politica-de-privacitat',
    redirectTo: 'politica-de-privacidad',
    pathMatch: 'full'
  },
  {
    path: 'condicions-generals',
    redirectTo: 'condiciones-generales',
    pathMatch: 'full'
  },
  {
    path: 'account/login',
    redirectTo: '/cuenta',
    pathMatch: 'full'
  },
  {
    path: 'proces-de-compra/step1',
    redirectTo: 'tienda-online'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
