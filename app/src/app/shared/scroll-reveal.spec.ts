import { ElementRef } from '@angular/core';
import { ScrollReveal } from './scroll-reveal';

describe('ScrollReveal', () => {
  it('should create an instance', () => {
    const element = document.createElement('div');
    const directive = new ScrollReveal(new ElementRef(element));
    expect(directive).toBeTruthy();
  });
});
