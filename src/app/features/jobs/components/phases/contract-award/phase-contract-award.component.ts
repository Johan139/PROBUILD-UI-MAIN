import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ContractMilestone {
  id: string;
  label: string;
  owner: string;
  done: boolean;
}

interface NegotiationLogEntry {
  id: number;
  topic: string;
  status: 'open' | 'resolved';
  updatedBy: string;
}

@Component({
  selector: 'app-phase-contract-award',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phase-contract-award.component.html',
  styleUrl: './phase-contract-award.component.scss',
})
export class PhaseContractAwardComponent {
  @Input() projectDetails: any;
  @Input() liveStageTemplate: TemplateRef<any> | null = null;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() proceed = new EventEmitter<void>();

  contractMethod: 'ai' | 'upload' | null = null;
  contractGenerating = false;
  contractGenerated = false;
  uploadedContractName = '';
  termsAccepted = false;

  readonly milestones: ContractMilestone[] = [
    { id: 'scope-freeze', label: 'Scope and VE inclusions frozen', owner: 'PM', done: true },
    { id: 'commercials', label: 'Commercial terms aligned', owner: 'Estimator', done: false },
    { id: 'client-signoff', label: 'Client legal signoff', owner: 'Client', done: false },
  ];

  readonly negotiationLog: NegotiationLogEntry[] = [
    { id: 1, topic: 'Retention release schedule', status: 'resolved', updatedBy: 'Finance' },
    { id: 2, topic: 'Allowances and exclusions appendix', status: 'open', updatedBy: 'PM' },
  ];

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

  get generatedContractName(): string {
    const projectName = this.projectDetails?.projectName || 'Project';
    return `${projectName}_Contract_v1.pdf`;
  }

  get completedItems(): number {
    const method = this.contractMethod ? 1 : 0;
    const completed =
      this.contractMethod === 'ai'
        ? this.contractGenerated
          ? 1
          : 0
        : this.contractMethod === 'upload'
          ? this.uploadedContractName
            ? 1
            : 0
          : 0;

    return method + completed;
  }

  get canProceed(): boolean {
    return this.completedItems === 2 && this.termsAccepted;
  }

  get milestoneDoneCount(): number {
    return this.milestones.filter((m) => m.done).length;
  }

  get resolvedNegotiations(): number {
    return this.negotiationLog.filter((entry) => entry.status === 'resolved').length;
  }

  selectMethod(method: 'ai' | 'upload'): void {
    this.contractMethod = method;
    if (method === 'ai') {
      this.uploadedContractName = '';
    }
    if (method === 'upload') {
      this.contractGenerating = false;
      this.contractGenerated = false;
    }
  }

  generateContract(): void {
    if (this.contractMethod !== 'ai' || this.contractGenerating || this.contractGenerated) {
      return;
    }

    this.contractGenerating = true;
    setTimeout(() => {
      this.contractGenerating = false;
      this.contractGenerated = true;
    }, 2000);
  }

  onContractFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadedContractName = file.name;
    input.value = '';
  }

  toggleMilestone(milestoneId: string): void {
    const milestone = this.milestones.find((entry) => entry.id === milestoneId);
    if (!milestone) {
      return;
    }

    milestone.done = !milestone.done;
  }

  toggleNegotiation(entryId: number): void {
    const entry = this.negotiationLog.find((item) => item.id === entryId);
    if (!entry) {
      return;
    }

    entry.status = entry.status === 'resolved' ? 'open' : 'resolved';
  }
}

