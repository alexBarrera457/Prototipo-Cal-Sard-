import { Routes } from '@angular/router';

import { BrandPage } from './pages/brand-page/brand-page';
import { ContactPage } from './pages/contact-page/contact-page';
import { HomePage } from './pages/home-page/home-page';

export const routes: Routes = [
  {
    path: '',
    title: 'Cal Sardà | Els productes de sempre des de 1930',
    component: HomePage
  },
  {
    path: 'historia',
    title: 'La història de Cal Sardà | Cal Sardà',
    component: BrandPage,
    data: { page: 'historia' }
  },
  {
    path: 'botiga-en-linia',
    title: 'Botiga en línia | Cal Sardà',
    component: BrandPage,
    data: { page: 'botiga-en-linia' }
  },
  {
    path: 'galeria',
    title: 'Galeria | Cal Sardà',
    component: BrandPage,
    data: { page: 'galeria' }
  },
  {
    path: 'contacte',
    title: 'Contacte | Cal Sardà',
    component: ContactPage
  },
  {
    path: 'newsletter-184400',
    title: 'Newsletter | Cal Sardà',
    component: BrandPage,
    data: { page: 'newsletter' }
  },
  {
    path: 'newsletter',
    redirectTo: 'newsletter-184400'
  },
  {
    path: 'descobreix-el-territori',
    title: 'Descobreix el territori | Cal Sardà',
    component: BrandPage,
    data: { page: 'descobreix-el-territori' }
  },
  {
    path: 'lots-per-a-empreses',
    title: 'Lots per a empreses | Cal Sardà',
    component: BrandPage,
    data: { page: 'lots-per-a-empreses' }
  },
  {
    path: 'lots-i-cistelles-gurmet',
    title: 'Lots i cistelles gurmet | Cal Sardà',
    component: BrandPage,
    data: { page: 'lots-i-cistelles-gurmet' }
  },
  {
    path: 'faq',
    title: 'Preguntes freqüents | Cal Sardà',
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
    path: 'avis-legal',
    title: 'Avís legal | Cal Sardà',
    component: BrandPage,
    data: { page: 'avis-legal' }
  },
  {
    path: 'politica-de-privacitat',
    title: 'Política de privacitat | Cal Sardà',
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
    path: 'condicions-generals',
    title: 'Condicions generals | Cal Sardà',
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
    path: 'account/login',
    redirectTo: 'contacte'
  },
  {
    path: 'proces-de-compra/step1',
    redirectTo: 'botiga-en-linia'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
