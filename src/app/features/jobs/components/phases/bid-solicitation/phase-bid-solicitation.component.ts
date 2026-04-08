
import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobInboundBiddingComponent } from './job-inbound-bidding.component';
import {
  PhaseNavigationHeaderComponent,
  PhaseReportRequestType,
} from '../shared/phase-navigation-header.component';
import { formatMoney } from '../../../../../shared/pipes/money.pipe';

interface SolicitationPacket {
  id: string;
  title: string;
  lane: 'trades' | 'vendors' | 'suppliers';
  status: 'draft' | 'published' | 'in-house';
  invites: number;
  dueDate: string;
  remindersSent: number;
  attachments: number;
}

interface ReadinessItem {
  id: string;
  label: string;
  done: boolean;
}

@Component({
  selector: 'app-phase-bid-solicitation',
  standalone: true,
  imports: [CommonModule, JobInboundBiddingComponent, PhaseNavigationHeaderComponent],
  templateUrl: './phase-bid-solicitation.component.html',
  styleUrl: './phase-bid-solicitation.component.scss',
})
export class PhaseBidSolicitationComponent {
  @Input() projectDetails: any;
  @Input() stageDisplayMode: 'stage' | 'live' = 'stage';
  @Input() canUseLiveStageView = true;
  @Input() liveStageTemplate: TemplateRef<any> | null = null;
  @Input() isReportLoading = false;
  @Input() showEnvironmentalReport = true;

  @ViewChild(JobInboundBiddingComponent)
  inboundBiddingComponent?: JobInboundBiddingComponent;

  @Output() setDisplayMode = new EventEmitter<'stage' | 'live'>();
  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() proceed = new EventEmitter<void>();
  @Output() documentsRequested = new EventEmitter<void>();
  @Output() reportRequested = new EventEmitter<PhaseReportRequestType>();

  packets: SolicitationPacket[] = [
    {
      id: 'electrical-labor',
      title: 'Electrical Labor Package',
      lane: 'trades',
      status: 'published',
      invites: 6,
      dueDate: 'Mar 10, 2026',
      remindersSent: 1,
      attachments: 4,
    },
    {
      id: 'plumbing-labor',
      title: 'Plumbing Labor Package',
      lane: 'trades',
      status: 'draft',
      invites: 5,
      dueDate: 'Mar 12, 2026',
      remindersSent: 0,
      attachments: 3,
    },
    {
      id: 'hvac-labor',
      title: 'HVAC Labor Package',
      lane: 'trades',
      status: 'published',
      invites: 7,
      dueDate: 'Mar 14, 2026',
      remindersSent: 2,
      attachments: 5,
    },
    {
      id: 'framing-materials',
      title: 'Framing Materials Package',
      lane: 'vendors',
      status: 'in-house',
      invites: 0,
      dueDate: 'Mar 09, 2026',
      remindersSent: 0,
      attachments: 2,
    },
    {
      id: 'roofing-materials',
      title: 'Roofing Materials Package',
      lane: 'vendors',
      status: 'published',
      invites: 4,
      dueDate: 'Mar 13, 2026',
      remindersSent: 1,
      attachments: 3,
    },
    {
      id: 'insulation-supply',
      title: 'Insulation Supply Request',
      lane: 'suppliers',
      status: 'draft',
      invites: 3,
      dueDate: 'Mar 11, 2026',
      remindersSent: 0,
      attachments: 2,
    },
  ];

  readonly readinessItems: ReadinessItem[] = [
    { id: 'scope', label: 'Scope and inclusions finalized', done: true },
    { id: 'timeline', label: 'Bid due dates confirmed', done: true },
    { id: 'attachments', label: 'Bid packet attachments uploaded', done: false },
    { id: 'invite-list', label: 'Invite list reviewed', done: false },
  ];

  selectedPacketId = this.packets[0].id;

  get tradeSummary() {
    const tradePackages = this.packets.filter((packet) => packet.lane === 'trades').length;
    const laborOnlyPackages = this.packets.filter((packet) => packet.lane === 'trades' && packet.status !== 'in-house').length;
    const supplierPackages = this.packets.filter((packet) => packet.lane === 'suppliers').length;
    const invitationsPending = this.packets
      .filter((packet) => packet.status !== 'in-house')
      .reduce((sum, packet) => sum + packet.invites, 0);

    return {
      tradePackages,
      laborOnlyPackages,
      supplierPackages,
      invitationsPending,
    };
  }

  get selectedPacket(): SolicitationPacket {
    return this.packets.find((packet) => packet.id === this.selectedPacketId) || this.packets[0];
  }

  get publishedCount(): number {
    return this.packets.filter((packet) => packet.status === 'published').length;
  }

  get draftCount(): number {
    return this.packets.filter((packet) => packet.status === 'draft').length;
  }

  get readinessPercent(): number {
    const done = this.readinessItems.filter((item) => item.done).length;
    return Math.round((done / this.readinessItems.length) * 100);
  }

  get canProceed(): boolean {
    if (this.stageDisplayMode !== 'stage') {
      return true;
    }

    return this.inboundBiddingComponent?.allChecklistItemsComplete ?? false;
  }

  get projectSizeSqFt(): string {
    return this.projectDetails?.buildingSize || this.projectDetails?.projectSize || '2,450';
  }

  get clientName(): string {
    const explicitClient = this.projectDetails?.clientName;
    if (explicitClient) {
      return explicitClient;
    }

    const first = this.projectDetails?.clientFirstName || '';
    const last = this.projectDetails?.clientLastName || '';
    const combined = `${first} ${last}`.trim();
    return combined;
  }

  get projectAddress(): string {
    return this.projectDetails?.address || this.projectDetails?.projectAddress;
  }

  get projectSizeSqM(): string {
    const numeric = Number(String(this.projectSizeSqFt).replace(/,/g, ''));
    if (Number.isNaN(numeric) || numeric <= 0) {
      return '228';
    }

    return formatMoney(Math.round(numeric * 0.0929), false, 0);
  }

  selectPacket(packetId: string): void {
    this.selectedPacketId = packetId;
  }

  cycleSelectedPacketStatus(): void {
    const packet = this.selectedPacket;
    if (!packet) {
      return;
    }

    if (packet.status === 'draft') {
      packet.status = 'published';
      return;
    }

    if (packet.status === 'published') {
      packet.status = 'in-house';
      return;
    }

    packet.status = 'draft';
  }

  sendReminder(packetId: string): void {
    const packet = this.packets.find((entry) => entry.id === packetId);
    if (!packet || packet.status === 'in-house') {
      return;
    }

    packet.remindersSent += 1;
  }

  toggleReadinessItem(itemId: string): void {
    const item = this.readinessItems.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    item.done = !item.done;
  }

  onInboundProceed(): void {
    if (!this.canProceed) {
      return;
    }

    this.proceed.emit();
  }
}

