import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { CookieBanner } from './components/cookie-banner/cookie-banner';

@Component({
  selector: 'app-root',
  imports: [Navbar, RouterOutlet, Footer, CookieBanner],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
