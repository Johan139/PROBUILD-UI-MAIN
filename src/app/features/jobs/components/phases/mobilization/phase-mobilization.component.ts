import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  lane: 'office' | 'field';
  available: boolean;
}

interface PendingInvite {
  name: string;
  email: string;
  role: string;
}

interface TradePackage {
  id: string;
  name: string;
  csiCode: string;
  budget: number;
  durationDays: number;
  status: 'posted' | 'in-house' | 'open';
}

@Component({
  selector: 'app-phase-mobilization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phase-mobilization.component.html',
  styleUrl: './phase-mobilization.component.scss',
})
export class PhaseMobilizationComponent {
  @Input() projectDetails: any;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() goLive = new EventEmitter<void>();

  startDate = '';
  officeTeamAssigned = false;
  fieldTeamAssigned = false;
  tradePackagesReady = false;

  showInviteForm = false;
  inviteName = '';
  inviteEmail = '';
  inviteRole = '';
  teamSearch = '';
  showOnlyAvailable = false;

  readonly teamMembers: TeamMember[] = [
    {
      id: 'tm-001',
      name: 'Savannah Patel',
      role: 'Project Manager',
      phone: '(512) 555-0141',
      lane: 'office',
      available: true,
    },
    {
      id: 'tm-002',
      name: 'Derek Alvarez',
      role: 'Assistant PM',
      phone: '(512) 555-0188',
      lane: 'office',
      available: true,
    },
    {
      id: 'tm-003',
      name: 'Malik Thompson',
      role: 'Superintendent',
      phone: '(512) 555-0192',
      lane: 'field',
      available: true,
    },
    {
      id: 'tm-004',
      name: 'Renee Campos',
      role: 'Foreman',
      phone: '(512) 555-0126',
      lane: 'field',
      available: false,
    },
  ];

  assignedMembers = new Set<string>(['tm-001']);
  pendingInvites: PendingInvite[] = [];

  readonly tradePackages: TradePackage[] = [
    {
      id: 'trade-01',
      name: 'Framing',
      csiCode: '06 10 00',
      budget: 86200,
      durationDays: 12,
      status: 'posted',
    },
    {
      id: 'trade-02',
      name: 'Mechanical / HVAC',
      csiCode: '23 00 00',
      budget: 46850,
      durationDays: 8,
      status: 'in-house',
    },
    {
      id: 'trade-03',
      name: 'Electrical',
      csiCode: '26 00 00',
      budget: 55200,
      durationDays: 10,
      status: 'posted',
    },
    {
      id: 'trade-04',
      name: 'Flooring',
      csiCode: '09 60 00',
      budget: 24200,
      durationDays: 6,
      status: 'open',
    },
  ];

  expandedTradeIds = new Set<string>();

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

  get officeTeam(): TeamMember[] {
    return this.filterTeamByLane('office');
  }

  get fieldTeam(): TeamMember[] {
    return this.filterTeamByLane('field');
  }

  get assignedOfficeCount(): number {
    return this.officeTeam.filter((m) => this.assignedMembers.has(m.id)).length;
  }

  get assignedFieldCount(): number {
    return this.fieldTeam.filter((m) => this.assignedMembers.has(m.id)).length;
  }

  get assignedMembersCount(): number {
    return this.assignedMembers.size;
  }

  get assignedTradeCount(): number {
    return this.tradePackages.filter((t) => t.status !== 'open').length;
  }

  get isStartDateSet(): boolean {
    return !!this.startDate;
  }

  get hasAssignedMembers(): boolean {
    return this.assignedMembers.size > 0;
  }

  get hasTradePartnersReady(): boolean {
    return this.tradePackages.some((t) => t.status !== 'open');
  }

  get availableCount(): number {
    return this.teamMembers.filter((member) => member.available).length;
  }

  get canGoLive(): boolean {
    return this.isStartDateSet && this.hasAssignedMembers;
  }

  get readinessPercent(): number {
    const score =
      Number(this.isStartDateSet) +
      Number(this.assignedOfficeCount > 0) +
      Number(this.assignedFieldCount > 0) +
      Number(this.hasTradePartnersReady);

    return (score / 4) * 100;
  }

  toggleMemberAssignment(memberId: string): void {
    const next = new Set(this.assignedMembers);
    if (next.has(memberId)) {
      next.delete(memberId);
    } else {
      next.add(memberId);
    }
    this.assignedMembers = next;
  }

  sendInvite(): void {
    if (!this.inviteName.trim() || !this.inviteEmail.trim() || !this.inviteRole.trim()) {
      return;
    }

    this.pendingInvites = [
      ...this.pendingInvites,
      {
        name: this.inviteName.trim(),
        email: this.inviteEmail.trim(),
        role: this.inviteRole.trim(),
      },
    ];

    this.inviteName = '';
    this.inviteEmail = '';
    this.inviteRole = '';
    this.showInviteForm = false;
  }

  removeInvite(index: number): void {
    this.pendingInvites = this.pendingInvites.filter((_, idx) => idx !== index);
  }

  toggleTradeExpanded(tradeId: string): void {
    const next = new Set(this.expandedTradeIds);
    if (next.has(tradeId)) {
      next.delete(tradeId);
    } else {
      next.add(tradeId);
    }
    this.expandedTradeIds = next;
  }

  getMemberInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  private filterTeamByLane(lane: 'office' | 'field'): TeamMember[] {
    const search = this.teamSearch.trim().toLowerCase();
    return this.teamMembers.filter((member) => {
      if (member.lane !== lane) {
        return false;
      }

      if (this.showOnlyAvailable && !member.available) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = `${member.name} ${member.role} ${member.phone}`.toLowerCase();
      return haystack.includes(search);
    });
  }
}

