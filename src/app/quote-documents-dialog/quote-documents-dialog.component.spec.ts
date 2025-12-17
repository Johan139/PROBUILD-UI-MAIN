import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuoteDocumentsDialogComponent } from './quote-documents-dialog.component';

describe('QuoteDocumentsDialogComponent', () => {
  let component: QuoteDocumentsDialogComponent;
  let fixture: ComponentFixture<QuoteDocumentsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuoteDocumentsDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteDocumentsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
