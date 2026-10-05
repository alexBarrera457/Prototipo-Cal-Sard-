import { Component } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { Hero } from '../../components/hero/hero';

type HomeCategory = {
  label: string;
  title: string;
  search: string;
  image: string;
  alt: string;
};

@Component({
  selector: 'app-home-page',
  imports: [Hero, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css'
})
export class HomePage {

  readonly categories: HomeCategory[] = [
    {
      label: 'Café de siempre',
      title: 'Café Sardà',
      search: 'CAFÉ GOURMET',
      image: '/images/products/cafe.jpg',
      alt: 'Café Sardà seleccionado en la tienda'
    },
    {
      label: 'Para abrir el apetito',
      title: 'Conservas del mar',
      search: 'CONSERVAS DE MAR',
      image: '/images/products/conservas.png',
      alt: 'Conservas gourmet del mar'
    },
    {
      label: 'A granel',
      title: 'Frutos secos',
      search: 'FRUTOS SECOS',
      image: '/images/products/frutos-secos.jpg',
      alt: 'Selección de frutos secos a granel'
    },
    {
      label: 'Para compartir',
      title: 'Dulces y turrones',
      search: 'DULCES DE FIESTAS',
      image: '/images/products/dulces-navidad.jpg',
      alt: 'Dulces tradicionales y turrones'
    }
  ];

  constructor(meta: Meta) {
    meta.updateTag({
      name: 'description',
      content: 'Desde 1930, Cal Sardà selecciona productos gourmet, dulces tradicionales, conservas y frutos secos en el barrio de la Sagrada Familia, Barcelona.'
    });
  }
}
