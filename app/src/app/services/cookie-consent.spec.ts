import { TestBed } from '@angular/core/testing';
import {
  COOKIE_STORAGE_ADAPTER,
  CookieConsent,
  CookieConsentService,
  CookieStorageAdapter,
  InMemoryCookieAdapter,
} from './cookie-consent';

describe('CookieConsentService', () => {
  let service: CookieConsentService;
  let testAdapter: CookieStorageAdapter;

  beforeEach(() => {
    testAdapter = new InMemoryCookieAdapter();

    TestBed.configureTestingModule({
      providers: [CookieConsentService, { provide: COOKIE_STORAGE_ADAPTER, useValue: testAdapter }],
    });

    service = TestBed.inject(CookieConsentService);
  });

  it('should start with visible banner and no tracking when no prior consent exists', () => {
    expect(service).toBeTruthy();
    expect(service.consent()).toBeNull();
    expect(service.isBannerVisible()).toBe(true);
    expect(service.isTrackingAllowed()).toBe(false);
    expect(service.showPreferences()).toBe(false);
  });

  it('loads previously stored consent on initialization and hides banner', () => {
    const priorConsent: CookieConsent = {
      status: 'accepted',
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: '2026-10-14T08:00:00.000Z',
    };
    const populatedAdapter = new InMemoryCookieAdapter(priorConsent);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CookieConsentService,
        { provide: COOKIE_STORAGE_ADAPTER, useValue: populatedAdapter },
      ],
    });

    const restoredService = TestBed.inject(CookieConsentService);
    expect(restoredService.consent()).toEqual(priorConsent);
    expect(restoredService.isBannerVisible()).toBe(false);
    expect(restoredService.isTrackingAllowed()).toBe(true);
  });

  it('acceptAll() grants all permissions, saves to storage, and hides banner', () => {
    service.acceptAll();

    const current = service.consent();
    expect(current).toBeTruthy();
    expect(current?.status).toBe('accepted');
    expect(current?.essential).toBe(true);
    expect(current?.analytics).toBe(true);
    expect(current?.marketing).toBe(true);
    expect(service.isBannerVisible()).toBe(false);
    expect(service.isTrackingAllowed()).toBe(true);
    expect(testAdapter.load()?.status).toBe('accepted');
  });

  it('rejectNonEssential() denies non-essential cookies and prevents tracking', () => {
    service.rejectNonEssential();

    const current = service.consent();
    expect(current).toBeTruthy();
    expect(current?.status).toBe('rejected');
    expect(current?.essential).toBe(true);
    expect(current?.analytics).toBe(false);
    expect(current?.marketing).toBe(false);
    expect(service.isBannerVisible()).toBe(false);
    expect(service.isTrackingAllowed()).toBe(false);
    expect(testAdapter.load()?.status).toBe('rejected');
  });

  it('manages custom preferences and closes preferences modal on save', () => {
    service.openPreferences();
    expect(service.showPreferences()).toBe(true);

    service.savePreferences({ analytics: true, marketing: false });

    const current = service.consent();
    expect(current?.status).toBe('custom');
    expect(current?.analytics).toBe(true);
    expect(current?.marketing).toBe(false);
    expect(service.showPreferences()).toBe(false);
    expect(service.isBannerVisible()).toBe(false);
    expect(service.isTrackingAllowed()).toBe(true);
  });

  it('resetConsent() clears storage and makes banner visible again', () => {
    service.acceptAll();
    expect(service.isBannerVisible()).toBe(false);

    service.resetConsent();
    expect(service.consent()).toBeNull();
    expect(service.isBannerVisible()).toBe(true);
    expect(service.isTrackingAllowed()).toBe(false);
    expect(testAdapter.load()).toBeNull();
  });
});
