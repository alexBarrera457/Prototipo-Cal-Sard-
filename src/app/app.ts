import { Component } from '@angular/core';

import { Navbar } from './components/navbar/navbar';
import { Hero } from './components/hero/hero';
import { History } from './components/history/history';
import { Products } from './components/products/products';
import { Categories } from './components/categories/categories';
import { Store } from './components/store/store';
import { Contact } from './components/contact/contact';
import { Footer } from './components/footer/footer';

@Component({
  selector: 'app-root',

  imports: [
    Navbar,
    Hero,
    History,
    Products,
    Categories,
    Store,
    Contact,
    Footer
  ],

  templateUrl: './app.html',
  styleUrl: './app.css'
})

export class App {}