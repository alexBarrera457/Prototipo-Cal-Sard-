import { Component, EventEmitter, Output } from '@angular/core';
import { CartService } from '../../services/cart';

@Component({
  selector: 'app-store',
  imports: [],
  templateUrl: './store.html',
  styleUrl: './store.css'
})
export class Store {

  @Output() productSelected = new EventEmitter<{
    name: string;
    category: string;
    description: string;
    price: number;
    number: string;
    image: string;
  }>();

  constructor(private cartService: CartService) {}

  addToCart(name: string, price: number): void {
    this.cartService.addToCart(name, price);
  }

  showProduct(
    name: string,
    category: string,
    description: string,
    price: number,
    number: string,
    image: string
  ): void {

    this.productSelected.emit({
      name,
      category,
      description,
      price,
      number,
      image
    });

  }

}