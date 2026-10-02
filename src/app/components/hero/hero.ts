import { Component } from '@angular/core';

@Component({
  selector: 'app-hero',
  imports: [],
  templateUrl: './hero.html',
  styleUrl: './hero.css'
})
export class Hero {

  goToStore(): void {

    document
      .getElementById('tienda')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

  }

}
