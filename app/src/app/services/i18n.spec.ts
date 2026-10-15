import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [I18nService],
    });
    service = TestBed.inject(I18nService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created and default to es or persisted language', () => {
    expect(service).toBeTruthy();
    expect(['es', 'ca']).toContain(service.currentLang());
  });

  it('switches to Catalan and persists preference', () => {
    service.setLanguage('ca');
    expect(service.currentLang()).toBe('ca');
    expect(localStorage.getItem('cal-sarda-lang')).toBe('ca');
    expect(document.documentElement.lang).toBe('ca');

    // Switch back to Spanish
    service.setLanguage('es');
    expect(service.currentLang()).toBe('es');
    expect(localStorage.getItem('cal-sarda-lang')).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('translates static navigation and footer keys in both languages', () => {
    service.setLanguage('es');
    expect(service.t('nav.shop')).toBe('Tienda online');
    expect(service.t('nav.history')).toBe('Historia');
    expect(service.t('nav.cart')).toBe('Tu cesta');
    expect(service.t('nav.menu')).toBe('MENÚ');
    expect(service.t('nav.my_account')).toBe('Mi cuenta');
    expect(service.t('footer.since')).toBe('DESDE 1930');

    service.setLanguage('ca');
    expect(service.t('nav.shop')).toBe('Botiga online');
    expect(service.t('nav.history')).toBe('Història');
    expect(service.t('nav.cart')).toBe('La teva cistella');
    expect(service.t('nav.menu')).toBe('MENÚ');
    expect(service.t('nav.my_account')).toBe('El meu compte');
    expect(service.t('footer.since')).toBe('DES DE 1930');
  });

  it('translates hero and homepage keys in both languages', () => {
    service.setLanguage('es');
    expect(service.t('hero.subtitle')).toBe('CAL SARDÀ · DESDE 1930');
    expect(service.t('hero.button')).toBe('VER PRODUCTOS');
    expect(service.t('hero.philosophy_label')).toBe('NUESTRA FILOSOFÍA');
    expect(service.t('home.story_mark')).toBe('Una historia de barrio');

    service.setLanguage('ca');
    expect(service.t('hero.subtitle')).toBe('CAL SARDÀ · DES DE 1930');
    expect(service.t('hero.button')).toBe('VEURE PRODUCTES');
    expect(service.t('hero.philosophy_label')).toBe('LA NOSTRA FILOSOFIA');
    expect(service.t('home.story_mark')).toBe('Una història de barri');
  });

  it('translates contact, checkout, blog, and account keys in both languages', () => {
    service.setLanguage('es');
    expect(service.t('contact.title')).toBe('Contacta con nosotros.');
    expect(service.t('checkout.title_line1')).toBe('Prepara tu');
    expect(service.t('blog.read_article')).toBe('Leer artículo');
    expect(service.t('account.welcome_back')).toBe('Bienvenido de nuevo');

    service.setLanguage('ca');
    expect(service.t('contact.title')).toBe('Contacta amb nosaltres.');
    expect(service.t('checkout.title_line1')).toBe('Prepara la teva');
    expect(service.t('blog.read_article')).toBe('Llegir article');
    expect(service.t('account.welcome_back')).toBe('Benvingut de nou');
  });

  it('translates product categories in both languages', () => {
    service.setLanguage('es');
    expect(service.translateCategory('CAFÉ GOURMET')).toBe('Café gourmet');
    expect(service.translateCategory('CONSERVAS DE MAR')).toBe('Conservas de mar');
    expect(service.translateCategory('EMBUTIDOS')).toBe('Embutidos');

    service.setLanguage('ca');
    expect(service.translateCategory('CAFÉ GOURMET')).toBe('Cafè gourmet');
    expect(service.translateCategory('CONSERVAS DE MAR')).toBe('Conserves de mar');
    expect(service.translateCategory('EMBUTIDOS')).toBe('Embotits');
  });
});
