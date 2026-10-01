import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {

  scrolled = false;
  transparentSection = false;
  cartOpen = false;
  mobileMenuOpen = false;

  constructor(public cartService: CartService) {}

  @HostListener('window:scroll')
  onWindowScroll(): void {

    const scrollPosition = window.scrollY;

    const categories = document.getElementById('categorias');

    this.scrolled = scrollPosition > 80;

    if (categories) {

      const rect = categories.getBoundingClientRect();

      this.transparentSection =
        rect.top <= 100 &&
        rect.bottom >= 100;

    }

  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.cartOpen) {
      this.closeCart();
    }

    if (this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  toggleCart(): void {
    this.cartOpen = !this.cartOpen;
    this.lockBodyScroll(this.cartOpen);

    if (this.cartOpen) {
      this.mobileMenuOpen = false;
      this.lockBodyScroll(true);
    }
  }

  closeCart(): void {
    this.cartOpen = false;
    this.lockBodyScroll(false);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;

    if (this.mobileMenuOpen) {
      this.cartOpen = false;
      this.lockBodyScroll(true);
    } else {
      this.lockBodyScroll(false);
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    this.lockBodyScroll(false);
  }

  private lockBodyScroll(shouldLock: boolean): void {
    const body = document.body;

    if (!body) {
      return;
    }

    body.style.overflow = shouldLock ? 'hidden' : '';
  }

}