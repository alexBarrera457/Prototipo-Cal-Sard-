import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { Navbar } from './navbar';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('moves through search results with the arrow keys', async () => {
    await component.onSearchInput('a');

    const down = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    component.onSearchKeydown(down);
    expect(down.defaultPrevented).toBe(true);
    expect(component.activeSearchResultIndex).toBe(0);

    component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(component.activeSearchResultIndex).toBe(1);

    component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true }));
    expect(component.activeSearchResultIndex).toBe(0);
  });

  it('opens the active search result with Enter and closes on Escape', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await component.onSearchInput('cafe');
    component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    component.onSearchKeydown(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));

    expect(navigate).toHaveBeenCalledWith(['/tienda-online'], {
      queryParams: { producto: '04', buscar: 'cafe' },
    });
    expect(component.searchOpen).toBe(false);

    await component.onSearchInput('chocolate');
    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    component.onSearchKeydown(escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(component.searchOpen).toBe(false);
  });
});
