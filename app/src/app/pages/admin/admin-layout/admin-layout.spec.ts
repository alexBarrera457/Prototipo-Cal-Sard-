import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AdminLayout } from './admin-layout';
import { AuthService, InMemoryAuthAdapter, AUTH_ADAPTER } from '../../../services/auth';

describe('AdminLayout', () => {
  let component: AdminLayout;
  let fixture: ComponentFixture<AdminLayout>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    const mockAdapter = new InMemoryAuthAdapter();
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [provideRouter([]), AuthService, { provide: AUTH_ADAPTER, useValue: mockAdapter }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayout);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    // Iniciar como admin
    await authService.signIn({
      email: 'admin@calsarda.com',
      password: 'admin1930',
    });
    fixture.detectChanges();
  });

  it('creates the admin layout and renders topbar', () => {
    expect(component).toBeTruthy();
    expect(component.sidebarOpen()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('CAL SARDÀ');
  });

  it('toggles and closes the sidebar', () => {
    expect(component.sidebarOpen()).toBe(false);

    component.toggleSidebar();
    expect(component.sidebarOpen()).toBe(true);

    component.closeSidebar();
    expect(component.sidebarOpen()).toBe(false);
  });

  it('signs out and navigates to /cuenta', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await component.signOut();

    expect(authService.isAuthenticated()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/cuenta']);
  });
});
