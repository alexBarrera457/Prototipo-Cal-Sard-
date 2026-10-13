import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { describe, beforeEach, it, expect } from 'vitest';
import { ContactPage } from './contact-page';

describe('ContactPage', () => {
  let component: ContactPage;
  let fixture: ComponentFixture<ContactPage>;
  let meta: Meta;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [Meta],
    }).compileComponents();

    meta = TestBed.inject(Meta);
    fixture = TestBed.createComponent(ContactPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component and updates the description meta tag', () => {
    expect(component).toBeTruthy();
    const tag = meta.getTag('name="description"');
    expect(tag?.content).toContain('Contacta con Cal Sardà');
  });

  it('renders the contact component template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-contact')).not.toBeNull();
  });
});
