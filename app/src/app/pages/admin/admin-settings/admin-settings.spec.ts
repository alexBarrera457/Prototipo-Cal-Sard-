import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { AdminSettings } from './admin-settings';
import { StoreSettingsService, DEFAULT_STORE_SETTINGS } from '../../../services/store-settings';
import { I18nService } from '../../../services/i18n';

describe('AdminSettings', () => {
  let component: AdminSettings;
  let fixture: ComponentFixture<AdminSettings>;
  let storeSettingsService: StoreSettingsService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AdminSettings],
      providers: [provideRouter([]), StoreSettingsService, I18nService],
    }).compileComponents();

    storeSettingsService = TestBed.inject(StoreSettingsService);
    fixture = TestBed.createComponent(AdminSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component with default store settings', () => {
    expect(component).toBeTruthy();
    expect(component.formData.fiscal.legalName).toBe(DEFAULT_STORE_SETTINGS.fiscal.legalName);
    expect(component.formData.fiscal.cif).toBe('B-08193026');
    expect(component.formData.hours.prepTimeHours).toBe(24);
    expect(component.formData.logistics.shippingCostBcn).toBe(4.9);
    expect(component.formData.notifications.emailStatusUpdates).toBe(true);
  });

  it('saves modified settings and displays confirmation toast', () => {
    component.formData.fiscal.phone = '+34 93 111 22 33';
    component.formData.logistics.freeShippingThreshold = 50.0;
    component.formData.notifications.enableBizumAlert = false;

    component.saveSettings();

    const currentSaved = storeSettingsService.settings();
    expect(currentSaved.fiscal.phone).toBe('+34 93 111 22 33');
    expect(currentSaved.logistics.freeShippingThreshold).toBe(50.0);
    expect(currentSaved.notifications.enableBizumAlert).toBe(false);

    expect(storeSettingsService.toastMessage()).toBeTruthy();
  });

  it('resets settings to default values', () => {
    component.formData.fiscal.phone = '+34 93 000 00 00';
    component.saveSettings();
    expect(storeSettingsService.settings().fiscal.phone).toBe('+34 93 000 00 00');

    component.resetDefaults();
    expect(component.formData.fiscal.phone).toBe(DEFAULT_STORE_SETTINGS.fiscal.phone);
    expect(storeSettingsService.settings().fiscal.phone).toBe(DEFAULT_STORE_SETTINGS.fiscal.phone);
    expect(storeSettingsService.toastMessage()).toBeTruthy();
  });

  it('renders all configuration cards and inputs in template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#settings-title')).toBeTruthy();
    expect(compiled.querySelectorAll('.settings-card').length).toBe(4);

    const legalNameInput = compiled.querySelector('#legalName') as HTMLInputElement;
    expect(legalNameInput).toBeTruthy();
    expect(legalNameInput.value).toBe(DEFAULT_STORE_SETTINGS.fiscal.legalName);

    const toggleInputs = compiled.querySelectorAll('.toggle-input');
    expect(toggleInputs.length).toBe(4);
  });
});
