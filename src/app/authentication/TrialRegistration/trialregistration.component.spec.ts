import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrialRegistrationComponent } from './trialregistration.component';

describe('RegistrationComponent', () => {
  let component: TrialRegistrationComponent;
  let fixture: ComponentFixture<TrialRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrialRegistrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrialRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
