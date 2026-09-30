import { Component, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-hero',
  imports: [],
  templateUrl: './hero.html',
  styleUrl: './hero.css'
})
export class Hero implements OnInit, OnDestroy {

  phrases = [
    'El "colmado" gourmet de Sagrada Familia.',
    'Desde 1930 ofrecemos un trato cercano y familiar.',
    'Los productos de siempre y de la mejor calidad.',
    'Cuatro generaciones.',
    'Más de 90 años ofreciendo un cuidado exquisito en la selección de productos.',
    'Productos auténticos.',
    'Buscamos lo mejor de cada región.',
    'La calidad es nuestro valor añadido.',
    'Productos de ahora y de siempre.'
  ];

  currentPhrase = 0;

  phraseVisible = true;

  private intervalId?: ReturnType<typeof setInterval>;

  ngOnInit(): void {

    this.intervalId = setInterval(() => {

      this.phraseVisible = false;

      setTimeout(() => {

        this.currentPhrase =
          (this.currentPhrase + 1) % this.phrases.length;

        this.phraseVisible = true;

      }, 700);

    }, 4000);

  }

  ngOnDestroy(): void {

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

  }

  goToStore(): void {

    document
      .getElementById('tienda')
      ?.scrollIntoView({
        behavior: 'smooth'
      });

  }

}