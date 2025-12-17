import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterServicesAgreementComponent } from './master-services-agreement.component';

describe('MasterServicesAgreementComponent', () => {
  let component: MasterServicesAgreementComponent;
  let fixture: ComponentFixture<MasterServicesAgreementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterServicesAgreementComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MasterServicesAgreementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
