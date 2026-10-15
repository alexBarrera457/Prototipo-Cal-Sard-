import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  type CanActivateFn,
  Router,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Functional Guard para proteger el acceso al Backoffice (/admin).
 * Requiere que el usuario esté autenticado con rol 'admin'.
 * En SSR permite el paso para que el navegador ejecute la verificación con la sesión del cliente (localStorage).
 * Si no está autenticado, redirige al login (/cuenta).
 * Si es cliente estándar, redirige con aviso de permiso denegado.
 */
export const adminGuard: CanActivateFn = async (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): Promise<boolean | UrlTree> => {
  const platformId = inject(PLATFORM_ID);

  // En renderizado en servidor (SSR), diferir la validación al navegador donde reside la sesión (localStorage / token)
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  // Si aún no se ha cargado el usuario y estamos inicializando en el navegador
  if (!auth.currentUser()) {
    await auth.initSession();
  }

  // 1. Usuario con permisos de administración concedidos
  if (auth.isAdmin()) {
    return true;
  }

  // 2. Usuario no autenticado: redirigir al login guardando la URL de destino
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/cuenta'], {
      queryParams: {
        returnUrl: state.url,
        motivo: 'requiere_identificacion',
      },
    });
  }

  // 3. Usuario autenticado como cliente común: acceso no autorizado
  return router.createUrlTree(['/cuenta'], {
    queryParams: {
      motivo: 'acceso_restringido',
    },
  });
};
