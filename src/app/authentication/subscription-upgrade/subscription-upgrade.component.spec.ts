import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionUpgradeComponent } from './subscription-upgrade.component';

describe('SubscriptionUpgradeComponent', () => {
  let component: SubscriptionUpgradeComponent;
  let fixture: ComponentFixture<SubscriptionUpgradeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionUpgradeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionUpgradeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
