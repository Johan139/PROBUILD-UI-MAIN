import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type AwardTab = 'trades' | 'vendors' | 'suppliers';

interface AwardItem {
  id: string;
  label: string;
  csi: string;
  estimate: number;
  bids: number;
  status: 'pending' | 'awarded' | 'na';
  bestBid: number;
  variance: number;
  recommendation: 'award' | 'review' | 'na';
  notes: string;
}

@Component({
  selector: 'app-phase-trade-award',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './phase-trade-award.component.html',
  styleUrl: './phase-trade-award.component.scss',
})
export class PhaseTradeAwardComponent {
  @Input() projectDetails: any;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() proceed = new EventEmitter<void>();

  awardTab: AwardTab = 'trades';

  tradeItems: AwardItem[] = [
    {
      id: 'electrical',
      label: 'Electrical Contractor',
      csi: '26 00 00',
      estimate: 55200,
      bids: 4,
      status: 'pending',
      bestBid: 53100,
      variance: -3.8,
      recommendation: 'award',
      notes: '',
    },
    {
      id: 'plumbing',
      label: 'Plumbing Contractor',
      csi: '22 00 00',
      estimate: 43800,
      bids: 3,
      status: 'pending',
      bestBid: 45500,
      variance: 3.9,
      recommendation: 'review',
      notes: '',
    },
    {
      id: 'hvac',
      label: 'HVAC Contractor',
      csi: '23 00 00',
      estimate: 46850,
      bids: 5,
      status: 'pending',
      bestBid: 46120,
      variance: -1.6,
      recommendation: 'award',
      notes: '',
    },
  ];

  vendorItems: AwardItem[] = [
    {
      id: 'lumber',
      label: 'Lumber Vendor',
      csi: '06 10 00',
      estimate: 16420,
      bids: 3,
      status: 'pending',
      bestBid: 15800,
      variance: -3.8,
      recommendation: 'award',
      notes: '',
    },
    {
      id: 'roofing',
      label: 'Roofing Vendor',
      csi: '07 50 00',
      estimate: 13900,
      bids: 2,
      status: 'pending',
      bestBid: 14220,
      variance: 2.3,
      recommendation: 'review',
      notes: '',
    },
  ];

  supplierItems: AwardItem[] = [
    {
      id: 'insulation',
      label: 'Insulation Supplier',
      csi: '07 21 00',
      estimate: 7200,
      bids: 3,
      status: 'pending',
      bestBid: 6950,
      variance: -3.5,
      recommendation: 'award',
      notes: '',
    },
    {
      id: 'paint',
      label: 'Paint Supplier',
      csi: '09 90 00',
      estimate: 4800,
      bids: 2,
      status: 'pending',
      bestBid: 4920,
      variance: 2.5,
      recommendation: 'review',
      notes: '',
    },
  ];

  selectedItemId = this.tradeItems[0].id;

  get projectSizeSqFt(): string {
    return this.projectDetails?.buildingSize || this.projectDetails?.projectSize || '2,450';
  }

  get projectSizeSqM(): string {
    const numeric = Number(String(this.projectSizeSqFt).replace(/,/g, ''));
    if (Number.isNaN(numeric) || numeric <= 0) {
      return '228';
    }

    return Math.round(numeric * 0.0929).toLocaleString();
  }

  get awardedCount(): number {
    return [...this.tradeItems, ...this.vendorItems, ...this.supplierItems].filter((x) => x.status === 'awarded')
      .length;
  }

  get naCount(): number {
    return [...this.tradeItems, ...this.vendorItems, ...this.supplierItems].filter((x) => x.status === 'na').length;
  }

  get totalCount(): number {
    return this.tradeItems.length + this.vendorItems.length + this.supplierItems.length;
  }

  get canProceed(): boolean {
    return this.awardedCount + this.naCount === this.totalCount;
  }

  get completionPercent(): number {
    return ((this.awardedCount + this.naCount) / this.totalCount) * 100;
  }

  get pendingCount(): number {
    return this.totalCount - (this.awardedCount + this.naCount);
  }

  get currentItems(): AwardItem[] {
    if (this.awardTab === 'trades') {
      return this.tradeItems;
    }

    if (this.awardTab === 'vendors') {
      return this.vendorItems;
    }

    return this.supplierItems;
  }

  get totalEstimatedValue(): number {
    return [...this.tradeItems, ...this.vendorItems, ...this.supplierItems].reduce((sum, item) => sum + item.estimate, 0);
  }

  get totalBestBidValue(): number {
    return [...this.tradeItems, ...this.vendorItems, ...this.supplierItems].reduce((sum, item) => sum + item.bestBid, 0);
  }

  get selectedItem(): AwardItem {
    return this.currentItems.find((item) => item.id === this.selectedItemId) || this.currentItems[0];
  }

  toggleAward(id: string): void {
    const item = [...this.tradeItems, ...this.vendorItems, ...this.supplierItems].find((x) => x.id === id);
    if (!item) {
      return;
    }

    item.status = item.status === 'awarded' ? 'pending' : 'awarded';
  }

  markNotApplicable(id: string): void {
    const item = [...this.tradeItems, ...this.vendorItems, ...this.supplierItems].find((x) => x.id === id);
    if (!item) {
      return;
    }

    item.status = item.status === 'na' ? 'pending' : 'na';
  }

  setTab(tab: AwardTab): void {
    this.awardTab = tab;
    this.selectedItemId = this.currentItems[0]?.id || '';
  }

  selectItem(itemId: string): void {
    this.selectedItemId = itemId;
  }

  setSelectedItemNotes(value: string): void {
    const item = this.selectedItem;
    if (!item) {
      return;
    }

    item.notes = value;
  }

  clearSelectedItemNotes(): void {
    const item = this.selectedItem;
    if (!item) {
      return;
    }

    item.notes = '';
  }
}

