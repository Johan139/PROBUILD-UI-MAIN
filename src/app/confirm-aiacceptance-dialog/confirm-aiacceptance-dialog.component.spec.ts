import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmAIAcceptanceDialogComponent } from './confirm-aiacceptance-dialog.component';

describe('ConfirmAIAcceptanceDialogComponent', () => {
  let component: ConfirmAIAcceptanceDialogComponent;
  let fixture: ComponentFixture<ConfirmAIAcceptanceDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmAIAcceptanceDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmAIAcceptanceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
