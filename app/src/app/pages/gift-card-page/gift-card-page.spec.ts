import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { GiftCardPage } from './gift-card-page';
import { GiftCardsService } from '../../services/gift-cards';
import { I18nService } from '../../services/i18n';

describe('GiftCardPage (#64)', () => {
  let component: GiftCardPage;
  let fixture: ComponentFixture<GiftCardPage>;
  let giftCardsService: GiftCardsService;

  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    await TestBed.configureTestingModule({
      imports: [GiftCardPage],
      providers: [provideRouter([]), GiftCardsService, I18nService],
    }).compileComponents();

    giftCardsService = TestBed.inject(GiftCardsService);
    fixture = TestBed.createComponent(GiftCardPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('creates component with initial default state', () => {
    expect(component).toBeTruthy();
    expect(component.activeTab()).toBe('buy');
    expect(component.selectedAmount()).toBe(50);
    expect(component.currentAmount()).toBe(50);
    expect(component.isPurchased()).toBe(false);
    expect(component.createdCard()).toBeNull();
  });

  it('switches between buy and balance check tabs', () => {
    component.setTab('check');
    expect(component.activeTab()).toBe('check');

    component.setTab('buy');
    expect(component.activeTab()).toBe('buy');
  });

  it('updates selected amount using preset buttons and custom amount input', () => {
    component.selectPreset(100);
    expect(component.selectedAmount()).toBe(100);
    expect(component.currentAmount()).toBe(100);

    // Custom amount >= 10
    component.onCustomAmountChange('65');
    expect(component.customAmountInput()).toBe('65');
    expect(component.currentAmount()).toBe(65);

    // Invalid or too low custom amount keeps selected preset fallback
    component.onCustomAmountChange('5');
    expect(component.currentAmount()).toBe(65); // previous valid selectedAmount
  });

  it('validates mandatory fields before submitting purchase', () => {
    const showToastSpy = vi.spyOn(component, 'showToast');
    const createSpy = vi.spyOn(giftCardsService, 'createGiftCard');

    // Empty fields
    component.senderName = '';
    component.recipientName = '';
    component.recipientEmail = '';
    component.submitPurchase();

    expect(createSpy).not.toHaveBeenCalled();
    expect(showToastSpy).toHaveBeenCalledWith('Por favor, completa los campos obligatorios (*).');
    expect(component.isPurchased()).toBe(false);
  });

  it('successfully creates digital gift card when form is valid', () => {
    component.senderName = 'Montserrat Sardà';
    component.senderEmail = 'montse@calsarda.cat';
    component.recipientName = 'Jordi Pujadas';
    component.recipientEmail = 'jordi@example.com';
    component.dedication = 'Moltes felicitats pel teu aniversari!';
    component.selectPreset(75);

    component.submitPurchase();

    expect(component.isPurchased()).toBe(true);
    const card = component.createdCard();
    expect(card).not.toBeNull();
    expect(card?.initialBalance).toBe(75);
    expect(card?.currentBalance).toBe(75);
    expect(card?.senderName).toBe('Montserrat Sardà');
    expect(card?.recipientName).toBe('Jordi Pujadas');
    expect(card?.code).toMatch(/^REGAL-CS-\d{4}$/);

    // Verify resetPurchase resets state
    component.resetPurchase();
    expect(component.isPurchased()).toBe(false);
    expect(component.createdCard()).toBeNull();
    expect(component.recipientName).toBe('');
  });

  it('handles balance check for empty, valid, and invalid codes', () => {
    // Empty code
    component.checkCodeInput = '   ';
    component.checkBalance();
    expect(component.balanceCheckResult().checked).toBe(true);
    expect(component.balanceCheckResult().valid).toBe(false);

    // Invalid code
    component.checkCodeInput = 'CODIGO-NO-EXISTE';
    component.checkBalance();
    expect(component.balanceCheckResult().valid).toBe(false);
    expect(component.balanceCheckResult().balance).toBe(0);

    // Valid preset code
    component.checkCodeInput = 'REGAL-CS-50';
    component.checkBalance();
    expect(component.balanceCheckResult().valid).toBe(true);
    expect(component.balanceCheckResult().balance).toBe(50);
    expect(component.balanceCheckResult().card?.recipientName).toBe('Client Fidel');
  });

  it('copies code to clipboard and triggers feedback toast', () => {
    const showToastSpy = vi.spyOn(component, 'showToast');
    component.copyCode('REGAL-CS-100');
    expect(showToastSpy).toHaveBeenCalled();
  });
});
