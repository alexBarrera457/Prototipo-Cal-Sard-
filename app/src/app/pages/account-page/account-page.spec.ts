import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { AccountPage } from './account-page';

describe('AccountPage', () => {
  let component: AccountPage;
  let fixture: ComponentFixture<AccountPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountPage, FormsModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component and starts with unauthenticated state', () => {
    expect(component).toBeTruthy();
    expect(component.loginDemoCompleted).toBe(false);
  });

  it('does not complete login if form is invalid', () => {
    const mockForm = {
      invalid: true,
      form: { markAllAsTouched: vi.fn() },
    } as unknown as NgForm;

    component.signIn(mockForm);
    expect(component.loginDemoCompleted).toBe(false);
  });

  it('completes login demo state when form is valid', () => {
    const mockForm = {
      invalid: false,
      resetForm: vi.fn(),
      form: { markAllAsTouched: vi.fn() },
    } as unknown as NgForm;

    component.email = 'cliente@calsarda.com';
    component.password = 'Secreto123!';
    component.signIn(mockForm);

    expect(component.loginDemoCompleted).toBe(true);

    component.returnToLogin();
    expect(component.loginDemoCompleted).toBe(false);
  });
});
