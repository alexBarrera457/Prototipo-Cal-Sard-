import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { HomePage } from './home-page';
import { SeoService } from '../../services/seo';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), SeoService],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the home page component and defines featured categories', () => {
    expect(component).toBeTruthy();
    expect(component.categories.length).toBe(4);
    expect(component.categories[0].search).toBe('CAFÉ GOURMET');
  });

  it('renders the featured categories in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const categoryCards = compiled.querySelectorAll('.home-category-card');
    expect(categoryCards.length).toBe(4);

    const firstCard = categoryCards[0];
    expect(firstCard.textContent).toContain('Café Sardà');
  });
});
