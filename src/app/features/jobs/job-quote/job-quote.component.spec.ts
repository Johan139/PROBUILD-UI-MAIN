import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobQuoteComponent } from './job-quote.component';

describe('JobQuoteComponent', () => {
  let component: JobQuoteComponent;
  let fixture: ComponentFixture<JobQuoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobQuoteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobQuoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
