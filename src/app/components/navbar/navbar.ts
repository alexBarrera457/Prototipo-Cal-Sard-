import { Component, HostListener } from '@angular/core';
import { CartService } from '../../services/cart';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {

  scrolled = false;
  transparentSection = false;
  cartOpen = false;

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

  toggleCart(): void {
    this.cartOpen = !this.cartOpen;
  }

  closeCart(): void {
    this.cartOpen = false;
  }

}