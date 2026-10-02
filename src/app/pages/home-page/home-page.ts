import { Component } from '@angular/core';
import { Meta } from '@angular/platform-browser';

import { Hero } from '../../components/hero/hero';
import { History } from '../../components/history/history';
import { Products } from '../../components/products/products';
import { Categories } from '../../components/categories/categories';
import { Store } from '../../components/store/store';
import { ProductDetail } from '../../components/product-detail/product-detail';
import { Contact } from '../../components/contact/contact';

@Component({
  selector: 'app-home-page',
  imports: [
    Hero,
    History,
    Products,
    Categories,
    Store,
    ProductDetail,
    Contact
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css'
})
export class HomePage {

  constructor(meta: Meta) {
    meta.updateTag({
      name: 'description',
      content: 'Desde 1930, Cal Sardà selecciona productos gourmet, turrones, vinos, chocolates, conservas y frutos secos en el corazón de Barcelona.'
    });
  }

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
