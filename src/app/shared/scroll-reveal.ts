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

  constructor(private element: ElementRef) {}

  ngAfterViewInit(): void {

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

    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}