import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForemanDashboardComponent } from './foreman-dashboard.component';

describe('ForemanDashboardComponent', () => {
  let component: ForemanDashboardComponent;
  let fixture: ComponentFixture<ForemanDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForemanDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ForemanDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
