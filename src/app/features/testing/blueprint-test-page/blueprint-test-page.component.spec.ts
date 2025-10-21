import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlueprintTestPageComponent } from './blueprint-test-page.component';

describe('BlueprintTestPageComponent', () => {
  let component: BlueprintTestPageComponent;
  let fixture: ComponentFixture<BlueprintTestPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlueprintTestPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlueprintTestPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
