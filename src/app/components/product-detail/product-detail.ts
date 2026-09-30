import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CartService } from '../../services/cart';

@Component({
  selector: 'app-product-detail',
  imports: [],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetail {

  @Input() product = {
    name: '',
    category: '',
    description: '',
    price: 0,
    number: '',
    image: ''
  };

  @Output() backToStore = new EventEmitter<void>();

  quantity = 1;

  constructor(private cartService: CartService) {}

  increaseQuantity(): void {
    this.quantity++;
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart(): void {

    for (let i = 0; i < this.quantity; i++) {

      this.cartService.addToCart(
        this.product.name,
        this.product.price
      );

    }

  }

  goBack(): void {

    this.backToStore.emit();

  }

}