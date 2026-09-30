import { Component } from '@angular/core';

import { Navbar } from './components/navbar/navbar';
import { Hero } from './components/hero/hero';
import { History } from './components/history/history';
import { Products } from './components/products/products';
import { Categories } from './components/categories/categories';
import { Store } from './components/store/store';
import { ProductDetail } from './components/product-detail/product-detail';
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
    ProductDetail,
    Contact,
    Footer
  ],

  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  productDetail = false;

  selectedProduct = {
    name: '',
    category: '',
    description: '',
    price: 0,
    number: '',
    image: ''
  };

  showProduct(product: {
    name: string;
    category: string;
    description: string;
    price: number;
    number: string;
    image: string;
  }): void {

    this.selectedProduct = product;

    this.productDetail = true;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  }

  hideProduct(): void {

    this.productDetail = false;

  }

}