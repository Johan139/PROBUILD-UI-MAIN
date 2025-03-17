import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveUserDashboardComponent } from './active-user-dashboard.component';

describe('ActiveUserDashboardComponent', () => {
  let component: ActiveUserDashboardComponent;
  let fixture: ComponentFixture<ActiveUserDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveUserDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiveUserDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
