import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type SupportedLanguage = 'ca' | 'es';

export const TRANSLATIONS = {
  es: {
    // Navigation
    'nav.history': 'Historia',
    'nav.shop': 'Tienda online',
    'nav.gallery': 'Galería',
    'nav.contact': 'Contacto',
    'nav.newsletter': 'Boletín',
    'nav.account': 'Cuenta',
    'nav.cart': 'Tu cesta',
    'nav.cart_empty_title': 'Tu cesta está vacía',
    'nav.cart_empty_desc': 'Añade alguno de nuestros productos para comenzar.',
    'nav.view_shop': 'Ver la tienda',
    'nav.checkout': 'Tramitar encargo',
    'nav.total': 'Total',
    'nav.search_placeholder': 'Buscar en el catálogo…',
    'nav.search_loading': 'Cargando productos…',
    'nav.search_no_results': 'No encontramos productos. Prueba con otra búsqueda.',
    'nav.search_view_all': 'Ver todos los resultados',
    'nav.close_cart': 'Cerrar cesta',
    'nav.close_menu': 'Cerrar menú',
    'nav.open_menu': 'Abrir menú de navegación',
    'nav.open_cart': 'Abrir cesta',

    // Footer
    'footer.since': 'DESDE 1930',
    'footer.tagline': 'Productos de siempre, selección cuidada y trato cercano desde 1930.',
    'footer.nav_title': 'NAVEGACIÓN',
    'footer.home': 'Inicio',
    'footer.faq': 'Preguntas frecuentes',
    'footer.blog': 'Blog',
    'footer.territory': 'Descubre el territorio',
    'footer.business_lots': 'Lotes para empresas',
    'footer.gourmet_lots': 'Lotes y cestas gourmet',
    'footer.contact_title': 'CONTACTO',
    'footer.info_title': 'INFORMACIÓN',
    'footer.legal': 'Aviso legal',
    'footer.privacy': 'Privacidad',
    'footer.cookies': 'Cookies',
    'footer.terms': 'Condiciones generales',
    'footer.sitemap': 'Mapa web',
    'footer.back_to_top': 'VOLVER ARRIBA ↑',
    'footer.location': 'BARCELONA · CATALUÑA',

    // Store & Categories
    'store.intro_kicker': 'CAL SARDÀ · TIENDA ONLINE',
    'store.intro_title': 'Una selección\npara disfrutar en casa.',
    'store.intro_desc':
      'Productos de la tienda, con fotos reales de Cal Sardà. Añádelos a la cesta y prepara un pedido de prueba.',
    'store.go_to_checkout': 'IR A LA COMPRA',
    'store.all_categories': 'Todos los productos',
    'store.search_results_for': 'Resultados para',
    'store.view_all_catalog': 'Ver todo el catálogo',
    'store.showing': 'mostrando',
    'store.sort_featured': 'Destacados',
    'store.sort_name_asc': 'Nombre (A-Z)',
    'store.sort_price_asc': 'Precio: de menor a mayor',
    'store.sort_price_desc': 'Precio: de mayor a menor',
    'store.add_to_cart': 'AÑADIR A LA CESTA +',
    'store.view_product': 'VER PRODUCTO →',
    'store.page': 'Página',
    'store.of': 'de',

    // Categories
    'cat.CAFE_GOURMET': 'Café gourmet',
    'cat.CONSERVAS_DE_MAR': 'Conservas de mar',
    'cat.DULCES_DE_FIESTAS': 'Dulces tradicionales de fiestas',
    'cat.FRUTOS_SECOS': 'Frutos secos a granel',
    'cat.GALLETAS_Y_PASTAS': 'Galletas y pastas',
    'cat.BODEGA_GOURMET': 'Bodega gourmet',
    'cat.CHOCOLATE_GOURMET': 'Chocolate gourmet',
    'cat.VIVERES_GOURMET': 'Víveres gourmet',
    'cat.HELADOS_Y_HORCHATA': 'Helados y horchata (solo Barcelona)',
    'cat.EMBUTIDOS': 'Embutidos',
  },
  ca: {
    // Navigation
    'nav.history': 'Història',
    'nav.shop': 'Botiga online',
    'nav.gallery': 'Galeria',
    'nav.contact': 'Contacte',
    'nav.newsletter': 'Butlletí',
    'nav.account': 'Compte',
    'nav.cart': 'La teva cistella',
    'nav.cart_empty_title': 'La teva cistella està buida',
    'nav.cart_empty_desc': 'Afegeix algun dels nostres productes per començar.',
    'nav.view_shop': 'Veure la botiga',
    'nav.checkout': 'Tramitar encàrrec',
    'nav.total': 'Total',
    'nav.search_placeholder': 'Cercar al catàleg…',
    'nav.search_loading': 'Carregant productes…',
    'nav.search_no_results': 'No hem trobat productes. Prova una altra cerca.',
    'nav.search_view_all': 'Veure tots els resultats',
    'nav.close_cart': 'Tancar cistella',
    'nav.close_menu': 'Tancar menú',
    'nav.open_menu': 'Obrir menú de navegació',
    'nav.open_cart': 'Obrir cistella',

    // Footer
    'footer.since': 'DES DE 1930',
    'footer.tagline': 'Productes de sempre, selecció acurada i tracte proper des de 1930.',
    'footer.nav_title': 'NAVEGACIÓ',
    'footer.home': 'Inici',
    'footer.faq': 'Preguntes freqüents',
    'footer.blog': 'Blog',
    'footer.territory': 'Descobreix el territori',
    'footer.business_lots': 'Lots per a empreses',
    'footer.gourmet_lots': 'Lots i cistelles gurmet',
    'footer.contact_title': 'CONTACTE',
    'footer.info_title': 'INFORMACIÓ',
    'footer.legal': 'Avís legal',
    'footer.privacy': 'Privacitat',
    'footer.cookies': 'Cookies',
    'footer.terms': 'Condicions generals',
    'footer.sitemap': 'Mapa web',
    'footer.back_to_top': 'TORNAR A DALT ↑',
    'footer.location': 'BARCELONA · CATALUNYA',

    // Store & Categories
    'store.intro_kicker': 'CAL SARDÀ · BOTIGA ONLINE',
    'store.intro_title': 'Una selecció\nper gaudir a casa.',
    'store.intro_desc':
      'Productes de la botiga, amb fotos reals de Cal Sardà. Afegeix-los a la cistella i prepara una comanda de prova.',
    'store.go_to_checkout': 'ANAR A LA COMPRA',
    'store.all_categories': 'Tots els productes',
    'store.search_results_for': 'Resultats per a',
    'store.view_all_catalog': 'Veure tot el catàleg',
    'store.showing': 'mostrant',
    'store.sort_featured': 'Destacats',
    'store.sort_name_asc': 'Nom (A-Z)',
    'store.sort_price_asc': 'Preu: de menor a major',
    'store.sort_price_desc': 'Preu: de major a menor',
    'store.add_to_cart': 'AFEGIR A LA CISTELLA +',
    'store.view_product': 'VEURE PRODUCTE →',
    'store.page': 'Pàgina',
    'store.of': 'de',

    // Categories
    'cat.CAFE_GOURMET': 'Cafè gourmet',
    'cat.CONSERVAS_DE_MAR': 'Conserves de mar',
    'cat.DULCES_DE_FIESTAS': 'Dolços tradicionals de festes',
    'cat.FRUTOS_SECOS': 'Fruits secs a granel',
    'cat.GALLETAS_Y_PASTAS': 'Galetes i pastes',
    'cat.BODEGA_GOURMET': 'Celler gourmet',
    'cat.CHOCOLATE_GOURMET': 'Xocolata gourmet',
    'cat.VIVERES_GOURMET': 'Queviures gourmet',
    'cat.HELADOS_Y_HORCHATA': 'Gelats i orxata (només Barcelona)',
    'cat.EMBUTIDOS': 'Embotits',
  },
} as const;

export type TranslationKey = keyof (typeof TRANSLATIONS)['es'];

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly storageKey = 'cal-sarda-lang';
  readonly currentLang = signal<SupportedLanguage>('es');

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const saved = localStorage.getItem(this.storageKey);
        if (saved === 'ca' || saved === 'es') {
          this.currentLang.set(saved);
        } else if (navigator?.language?.toLowerCase().startsWith('ca')) {
          this.currentLang.set('ca');
        }
      } catch {
        // En caso de almacenamiento restringido
      }
      this.updateDocumentLang(this.currentLang());
    }
  }

  setLanguage(lang: SupportedLanguage): void {
    this.currentLang.set(lang);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.storageKey, lang);
      } catch {
        // Almacenamiento deshabilitado
      }
      this.updateDocumentLang(lang);
    }
  }

  t(key: TranslationKey): string {
    const lang = this.currentLang();
    const dict = TRANSLATIONS[lang] as Record<string, string>;
    const fallback = TRANSLATIONS.es as Record<string, string>;
    return dict[key] ?? fallback[key] ?? key;
  }

  translateCategory(categoryValue: string): string {
    const normalized = categoryValue
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ /g, '_');
    const key = `cat.${normalized}` as TranslationKey;
    return this.t(key);
  }

  private updateDocumentLang(lang: string): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = lang;
    }
  }
}
