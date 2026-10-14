import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  COOKIE_STORAGE_ADAPTER,
  CookieConsent,
  CookieConsentService,
  InMemoryCookieAdapter,
} from '../../services/cookie-consent';
import { CookieBanner } from './cookie-banner';

describe('CookieBanner', () => {
  let component: CookieBanner;
  let fixture: ComponentFixture<CookieBanner>;
  let cookieService: CookieConsentService;
  let testAdapter: InMemoryCookieAdapter;

  beforeEach(async () => {
    testAdapter = new InMemoryCookieAdapter();

    await TestBed.configureTestingModule({
      imports: [CookieBanner],
      providers: [
        provideRouter([]),
        CookieConsentService,
        { provide: COOKIE_STORAGE_ADAPTER, useValue: testAdapter },
      ],
    }).compileComponents();

    cookieService = TestBed.inject(CookieConsentService);
    fixture = TestBed.createComponent(CookieBanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders the banner on initial visit when no consent exists', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const banner = compiled.querySelector('.cookie-banner');
    expect(banner).toBeTruthy();
    expect(compiled.querySelector('.cookie-btn-accept')).toBeTruthy();
    expect(compiled.querySelector('.cookie-btn-reject')).toBeTruthy();
    expect(compiled.querySelector('.cookie-btn-configure')).toBeTruthy();
  });

  it('hides the banner when already accepted or rejected', async () => {
    const priorConsent: CookieConsent = {
      status: 'accepted',
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: '2026-10-14T08:00:00.000Z',
    };
    testAdapter.save(priorConsent);
    cookieService.consent.set(priorConsent);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cookie-banner')).toBeFalsy();
  });

  it('clicking accept-all grants all cookies and hides banner', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const acceptBtn = compiled.querySelector<HTMLButtonElement>('.cookie-btn-accept');
    expect(acceptBtn).toBeTruthy();

    acceptBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cookieService.consent()?.status).toBe('accepted');
    expect(cookieService.consent()?.analytics).toBe(true);
    expect(cookieService.isBannerVisible()).toBe(false);
    expect(compiled.querySelector('.cookie-banner')).toBeFalsy();
  });

  it('clicking reject-non-essential denies analytics and hides banner', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rejectBtn = compiled.querySelector<HTMLButtonElement>('.cookie-btn-reject');
    expect(rejectBtn).toBeTruthy();

    rejectBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cookieService.consent()?.status).toBe('rejected');
    expect(cookieService.consent()?.analytics).toBe(false);
    expect(cookieService.isBannerVisible()).toBe(false);
    expect(compiled.querySelector('.cookie-banner')).toBeFalsy();
  });

  it('opens preferences modal, updates checkboxes, and saves custom consent', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const configureBtn = compiled.querySelector<HTMLButtonElement>('.cookie-btn-configure');
    configureBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const modal = compiled.querySelector('.cookie-preferences-modal');
    expect(modal).toBeTruthy();

    // Toggle analytics to true and marketing to false
    component.analyticsChecked.set(true);
    component.marketingChecked.set(false);
    fixture.detectChanges();

    const saveBtn = compiled.querySelector<HTMLButtonElement>('.cookie-btn-save');
    saveBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cookieService.consent()?.status).toBe('custom');
    expect(cookieService.consent()?.analytics).toBe(true);
    expect(cookieService.consent()?.marketing).toBe(false);
    expect(cookieService.showPreferences()).toBe(false);
    expect(compiled.querySelector('.cookie-preferences-modal')).toBeFalsy();
  });

  it('closes preferences modal when Escape is pressed', async () => {
    component.openPreferences();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cookieService.showPreferences()).toBe(true);

    component.onEscape();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(cookieService.showPreferences()).toBe(false);
  });
});
