import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoreSettingsService, DEFAULT_STORE_SETTINGS, type StoreSettings } from './store-settings';

describe('StoreSettingsService', () => {
  let service: StoreSettingsService;

  beforeEach(() => {
    localStorage.clear();
    service = new StoreSettingsService();
  });

  it('initializes with default store settings', () => {
    const settings = service.settings();
    expect(settings.fiscal.legalName).toBe('Cal Sardà Obrador Gastronòmic S.L.');
    expect(settings.fiscal.cif).toBe('B-08193026');
    expect(settings.hours.prepTimeHours).toBe(24);
    expect(settings.logistics.freeShippingThreshold).toBe(80.0);
    expect(settings.notifications.emailStatusUpdates).toBe(true);
  });

  it('persists modified settings into localStorage and updates signal', () => {
    const updated: StoreSettings = {
      ...DEFAULT_STORE_SETTINGS,
      fiscal: {
        ...DEFAULT_STORE_SETTINGS.fiscal,
        phone: '+34 93 999 88 77',
      },
      logistics: {
        ...DEFAULT_STORE_SETTINGS.logistics,
        freeShippingThreshold: 60.0,
      },
    };

    service.saveSettings(updated);

    expect(service.settings().fiscal.phone).toBe('+34 93 999 88 77');
    expect(service.settings().logistics.freeShippingThreshold).toBe(60.0);

    const savedRaw = localStorage.getItem('cal_sarda_admin_settings');
    expect(savedRaw).toBeTruthy();
    const parsed = JSON.parse(savedRaw!);
    expect(parsed.fiscal.phone).toBe('+34 93 999 88 77');
  });

  it('resets settings to default values', () => {
    const modified: StoreSettings = {
      ...DEFAULT_STORE_SETTINGS,
      fiscal: {
        ...DEFAULT_STORE_SETTINGS.fiscal,
        phone: '+34 00 000 00 00',
      },
    };
    service.saveSettings(modified);
    expect(service.settings().fiscal.phone).toBe('+34 00 000 00 00');

    service.resetToDefaults();
    expect(service.settings().fiscal.phone).toBe('+34 93 245 67 89');
  });

  it('displays and clears toast messages', () => {
    vi.useFakeTimers();
    service.showToast('Cambios guardados con éxito', 2000);
    expect(service.toastMessage()).toBe('Cambios guardados con éxito');

    vi.advanceTimersByTime(2500);
    expect(service.toastMessage()).toBeNull();
    vi.useRealTimers();
  });
});
