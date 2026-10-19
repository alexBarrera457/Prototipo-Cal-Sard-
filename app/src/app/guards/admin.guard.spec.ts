import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import {
  Router,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { adminGuard } from './admin.guard';
import { AuthService, InMemoryAuthAdapter, AUTH_ADAPTER } from '../services/auth';

describe('adminGuard', () => {
  let authService: AuthService;
  let router: Router;
  let mockAdapter: InMemoryAuthAdapter;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/admin/pedidos' } as RouterStateSnapshot;

  beforeEach(() => {
    mockAdapter = new InMemoryAuthAdapter();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AUTH_ADAPTER, useValue: mockAdapter },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('allows access when user is authenticated with admin role', async () => {
    await authService.signIn({
      email: 'admin@calsarda.com',
      password: 'admin1930',
    });

    const result = await TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));

    expect(result).toBe(true);
  });

  it('redirects to /cuenta with returnUrl when user is not authenticated', async () => {
    await authService.signOut();

    const result = await TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));

    expect(typeof result).not.toBe('boolean');
    const urlTree = result as UrlTree;
    expect(urlTree.queryParams['returnUrl']).toBe('/admin/pedidos');
    expect(urlTree.queryParams['motivo']).toBe('requiere_identificacion');
  });

  it('blocks and redirects to /cuenta when user is customer without admin rights', async () => {
    await authService.signIn({
      email: 'cliente@calsarda.com',
      password: 'cliente1930',
    });

    const result = await TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));

    expect(typeof result).not.toBe('boolean');
    const urlTree = result as UrlTree;
    expect(urlTree.queryParams['motivo']).toBe('acceso_restringido');
  });

  it('blocks and redirects to /cuenta in SSR/server environment without exposing admin view', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AUTH_ADAPTER, useValue: mockAdapter },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const result = await TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));

    expect(typeof result).not.toBe('boolean');
    const urlTree = result as UrlTree;
    expect(urlTree.queryParams['returnUrl']).toBe('/admin/pedidos');
    expect(urlTree.queryParams['motivo']).toBe('requiere_identificacion');
  });
});
