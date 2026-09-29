import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {

  scrolled = false;
  transparentSection = false;

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

}