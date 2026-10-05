import { Component, DestroyRef, signal } from '@angular/core';

type HistoryBookPage = {
  title: string;
  paragraphs: string[];
  images: Array<{ src: string; alt: string }>;
};

@Component({
  selector: 'app-history-book',
  templateUrl: './history-book.html',
  styleUrl: './history-book.css'
})
export class HistoryBookComponent {
  readonly pages: HistoryBookPage[] = [
    {
      title: 'La lechería, la tienda de bacalao y el café de los años 30',
      paragraphs: [
        'La historia de Cal Sardà se remonta a los años 30, cuando los bisabuelos de la familia, Jaume Sardà Fontoba y Flora Güell Subirà, abrieron una lechería en el barrio de la Sagrada Familia de Barcelona. El negocio prosperó y, en poco tiempo, se mudaron al local actual, un establecimiento mucho más grande que convirtieron en una tienda de bacalao donde también vendían fruta, verdura, huevos y víveres.',
        'Durante los difíciles años de la posguerra la familia consiguió una licencia de torrefactores que les permitió comprar café crudo de Colombia y Brasil, tostarlo artesanalmente y venderlo bajo la famosa marca Café Sardà.'
      ],
      images: [
        { src: '/images/history/historia-origenes.jpg', alt: 'Fotografía antigua del comercio de la familia y sus productos frescos' },
        { src: '/images/history/historia-cafe.jpg', alt: 'Molino de café en el interior de Cal Sardà' }
      ]
    },
    {
      title: 'La prosperidad y la primera reforma',
      paragraphs: [
        'Con los años, los hijos de Jaume y Flora tomaron las riendas del negocio y lo hicieron crecer. Hacia los años 50 llegaron a ser 14 trabajadores, la mayoría de miembros de la familia Sardà y amigos de Belianes, pueblo natal de Jaume Sardà Güell.',
        'En 1958 el abuelo Jaume impulsó la primera reforma del local para convertirlo en el conocido "colmado" del barrio de la Sagrada Familia. Dejaron de vender verdura y bacalao para centrarse en la venta de su café y de víveres de calidad y proximidad como las galletas, los turrones o los frutos secos a granel.',
        'Poco después, Maria Sardà Sardà, hija del abuelo Jaume, empezó a trabajar en este nuevo negocio y hoy continúa siendo la propietaria. María continúa atendiendo diariamente los clientes, de quienes conoce todos los nombres, gustos y preferencias.'
      ],
      images: [
        { src: '/images/history/historia-tienda-50s.jpg', alt: 'Interior antiguo de la tienda con el mostrador y productos' },
        { src: '/images/history/historia-colmado.jpg', alt: 'Dependienta del antiguo colmado familiar' }
      ]
    },
    {
      title: 'La renovación manteniendo la essencia del antiguo «colmado»',
      paragraphs: [
        'No es hasta el 2016 que Marta Izquierdo Sardà, bisnieta de Jaume Sardà Fontoba, impulsa una nueva reforma para adaptarse a los cambios del barrio y a las nuevas necesidades de los vecinos. Se renueva manteniendo la esencia del antiguo colmado y la relación de proximidad con la clientela más fiel pero ampliando la oferta a nuevos productos.',
        'Todo y los cambios, el trato de proximidad y confianza que las 4 generaciones de mujeres de la familia han ofrecido a sus clientes se ha mantenido siempre inalterable a Cal Sardà.'
      ],
      images: [
        { src: '/images/history/historia-clientes-2016.jpg', alt: 'Interior renovado de la tienda con atención a los clientes' },
        { src: '/images/history/historia-renovacion.jpg', alt: 'Mostrador y estanterías del local reformado de Cal Sardà' }
      ]
    }
  ];

  currentPage = 0;
  readonly currentPhoto = signal(0);
  readonly isTurning = signal(false);
  readonly isPhotoChanging = signal(false);
  pageDirection: 'forward' | 'backward' = 'forward';
  private turnTimeout?: ReturnType<typeof setTimeout>;
  private photoRotationInterval?: ReturnType<typeof setInterval>;
  private photoAnimationTimeout?: ReturnType<typeof setTimeout>;

  get currentPageContent(): HistoryBookPage {
    return this.pages[this.currentPage];
  }

  get currentPhotoContent(): HistoryBookPage['images'][number] {
    return this.currentPageContent.images[this.currentPhoto()];
  }

  constructor(destroyRef: DestroyRef) {
    this.startPhotoRotation();
    destroyRef.onDestroy(() => {
      this.clearTurnTimeout();
      this.clearPhotoRotation();
      this.clearPhotoAnimationTimeout();
    });
  }

  showPage(index: number): void {
    if (index < 0 || index >= this.pages.length || index === this.currentPage) {
      return;
    }

    this.pageDirection = index > this.currentPage ? 'forward' : 'backward';
    this.currentPage = index;
    this.currentPhoto.set(0);
    this.isPhotoChanging.set(false);
    this.clearPhotoAnimationTimeout();
    this.isTurning.set(true);
    this.clearTurnTimeout();
    this.turnTimeout = setTimeout(() => {
      this.isTurning.set(false);
      this.turnTimeout = undefined;
    }, 600);
    this.startPhotoRotation();
  }

  private startPhotoRotation(): void {
    this.clearPhotoRotation();
    if (this.currentPageContent.images.length < 2) {
      return;
    }

    this.photoRotationInterval = setInterval(() => {
      this.currentPhoto.update(index => (index + 1) % this.currentPageContent.images.length);
      this.isPhotoChanging.set(true);
      this.clearPhotoAnimationTimeout();
      this.photoAnimationTimeout = setTimeout(() => {
        this.isPhotoChanging.set(false);
        this.photoAnimationTimeout = undefined;
      }, 700);
    }, 5000);
  }

  private clearPhotoRotation(): void {
    if (this.photoRotationInterval !== undefined) {
      clearInterval(this.photoRotationInterval);
      this.photoRotationInterval = undefined;
    }
  }

  private clearPhotoAnimationTimeout(): void {
    if (this.photoAnimationTimeout !== undefined) {
      clearTimeout(this.photoAnimationTimeout);
      this.photoAnimationTimeout = undefined;
    }
  }

  private clearTurnTimeout(): void {
    if (this.turnTimeout !== undefined) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }
  }
}
