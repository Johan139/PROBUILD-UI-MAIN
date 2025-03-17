import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SortedBarChartComponent } from './sorted-bar-chart.component';

describe('SortedBarChartComponent', () => {
  let component: SortedBarChartComponent;
  let fixture: ComponentFixture<SortedBarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SortedBarChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SortedBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
