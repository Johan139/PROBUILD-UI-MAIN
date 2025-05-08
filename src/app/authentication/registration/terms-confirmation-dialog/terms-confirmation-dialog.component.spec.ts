import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TermsConfirmationDialogComponent } from './terms-confirmation-dialog.component';

describe('TermsConfirmationDialogComponent', () => {
  let component: TermsConfirmationDialogComponent;
  let fixture: ComponentFixture<TermsConfirmationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsConfirmationDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TermsConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
