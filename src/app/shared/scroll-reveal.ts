import {
  Directive,
  ElementRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true
})
export class ScrollReveal implements AfterViewInit, OnDestroy {

  private observer?: IntersectionObserver;

  constructor(private element: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {

    const nativeElement = this.element?.nativeElement;

    if (!nativeElement) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      nativeElement.classList.add('visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {

        entries.forEach((entry) => {

          if (entry.isIntersecting) {

            entry.target.classList.add('visible');

            this.observer?.unobserve(entry.target);

          }

        });

      },
      {
        threshold: 0.15
      }
    );

    this.observer.observe(nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}