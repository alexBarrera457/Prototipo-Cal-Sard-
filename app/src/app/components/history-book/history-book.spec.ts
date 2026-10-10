import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { HistoryBookComponent } from './history-book';

describe('HistoryBookComponent', () => {
  describe('in browser environment', () => {
    let component: HistoryBookComponent;
    let fixture: ComponentFixture<HistoryBookComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HistoryBookComponent],
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      }).compileComponents();

      fixture = TestBed.createComponent(HistoryBookComponent);
      component = fixture.componentInstance;
      await fixture.whenStable();
    });

    it('should create and display the first page', () => {
      expect(component).toBeTruthy();
      expect(component.currentPage).toBe(0);
      expect(component.currentPageContent.title).toContain('La lechería');
    });

    it('should allow navigating between pages', () => {
      component.showPage(1);
      expect(component.currentPage).toBe(1);
      expect(component.pageDirection).toBe('forward');
      expect(component.currentPageContent.title).toContain('La prosperidad');

      component.showPage(0);
      expect(component.currentPage).toBe(0);
      expect(component.pageDirection).toBe('backward');
    });

    it('should clean up on destroy without throwing', () => {
      expect(() => fixture.destroy()).not.toThrow();
    });
  });

  describe('in server (SSR) environment', () => {
    let component: HistoryBookComponent;
    let fixture: ComponentFixture<HistoryBookComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HistoryBookComponent],
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      }).compileComponents();

      fixture = TestBed.createComponent(HistoryBookComponent);
      component = fixture.componentInstance;
      await fixture.whenStable();
    });

    it('should create without starting timers or intervals on server', () => {
      expect(component).toBeTruthy();
      expect(component.currentPhoto()).toBe(0);
    });
  });
});
