import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  Brain,
  ClipboardList,
  FileSignature,
  ShieldCheck,
  Send,
  Hammer,
  FlagTriangleRight,
  HardHat,
  FolderCheck,
  CheckCircle2,
} from 'lucide-angular';

type LegacyStage =
  | 'ANALYZING'
  | 'NEW'
  | 'PRELIMINARY'
  | 'BIDDING'
  | 'LIVE'
  | 'ACTIVE'
  | 'CLOSURE'
  | 'ARCHIVED'
  | 'COMPLETED';

type CanonicalPhase =
  | 'INITIATION'
  | 'PRELIMINARY_SCOPE'
  | 'DETAILED_TAKEOFF'
  | 'CONTRACT_AWARD'
  | 'PRE_CONSTRUCTION'
  | 'BID_SOLICITATION'
  | 'TRADE_AWARD'
  | 'MOBILIZATION'
  | 'CONSTRUCTION_LIVE'
  | 'CLOSEOUT';

type StepperStage = LegacyStage | CanonicalPhase;

interface LifecycleStep {
  id: CanonicalPhase;
  label: string;
  shortLabel: string;
  icon: any;
  mappedStatus: StepperStage[];
}

@Component({
  selector: 'app-project-stage-stepper',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './project-stage-stepper.component.html',
  styleUrls: ['./project-stage-stepper.component.scss']
})
export class ProjectStageStepperComponent implements OnChanges {
  @Input() currentStage: StepperStage = 'ANALYZING';

  lifecycleSteps: LifecycleStep[] = [
    {
      id: 'INITIATION',
      label: 'Project Initiation',
      shortLabel: 'Initiation',
      icon: Brain,
      mappedStatus: ['ANALYZING', 'NEW', 'INITIATION'],
    },
    {
      id: 'PRELIMINARY_SCOPE',
      label: 'Preliminary Scope Review',
      shortLabel: 'Scope Review',
      icon: ClipboardList,
      mappedStatus: ['PRELIMINARY', 'PRELIMINARY_SCOPE'],
    },
    {
      id: 'DETAILED_TAKEOFF',
      label: 'Detailed Estimating & Takeoff',
      shortLabel: 'Estimating',
      icon: ClipboardList,
      mappedStatus: ['DETAILED_TAKEOFF'],
    },
    {
      id: 'CONTRACT_AWARD',
      label: 'Contract Award & Execution',
      shortLabel: 'Contract',
      icon: FileSignature,
      mappedStatus: ['CONTRACT_AWARD'],
    },
    {
      id: 'PRE_CONSTRUCTION',
      label: 'Pre-Construction & Compliance',
      shortLabel: 'Compliance',
      icon: ShieldCheck,
      mappedStatus: ['PRE_CONSTRUCTION'],
    },
    {
      id: 'BID_SOLICITATION',
      label: 'Subcontractor Bid Solicitation',
      shortLabel: 'Bid Solicitation',
      icon: Send,
      mappedStatus: ['BIDDING', 'BID_SOLICITATION'],
    },
    {
      id: 'TRADE_AWARD',
      label: 'Subcontract Award & Contracting',
      shortLabel: 'Sub Award',
      icon: Hammer,
      mappedStatus: ['TRADE_AWARD'],
    },
    {
      id: 'MOBILIZATION',
      label: 'Project Mobilization',
      shortLabel: 'Mobilization',
      icon: FlagTriangleRight,
      mappedStatus: ['MOBILIZATION'],
    },
    {
      id: 'CONSTRUCTION_LIVE',
      label: 'Construction Execution (Live)',
      shortLabel: 'Construction',
      icon: HardHat,
      mappedStatus: ['LIVE', 'ACTIVE', 'CONSTRUCTION_LIVE'],
    },
    {
      id: 'CLOSEOUT',
      label: 'Project Closeout & Handover',
      shortLabel: 'Closeout',
      icon: FolderCheck,
      mappedStatus: ['CLOSURE', 'ARCHIVED', 'COMPLETED', 'CLOSEOUT'],
    },
  ];

  currentStepId: CanonicalPhase = 'INITIATION';
  progressWidth: string = '0%';

  CheckCircle2 = CheckCircle2;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStage']) {
      this.updateProgress();
    }
  }

  private updateProgress() {
    const stage = this.currentStage
      ? this.currentStage.toUpperCase()
      : 'ANALYZING';

    // Find the step index based on the status mapping
    const stepIndex = this.lifecycleSteps.findIndex((step) =>
      step.mappedStatus.includes(stage as StepperStage),
    );

    // Default to first step if not found
    const index = stepIndex >= 0 ? stepIndex : 0;

    this.currentStepId = this.lifecycleSteps[index].id;

    // Calculate width percentage
    // If there are 5 steps, indexes are 0,1,2,3,4.
    // 0 -> 0%
    // 4 -> 100%
    const totalSteps = this.lifecycleSteps.length - 1;
    this.progressWidth = `${(index / totalSteps) * 100}%`;
  }

  getStepLabel(stepId: CanonicalPhase): string {
    const step = this.lifecycleSteps.find((s) => s.id === stepId);
    return step?.label || '';
  }

  isStepCompleted(stepId: CanonicalPhase): boolean {
    const currentIndex = this.lifecycleSteps.findIndex(
      (s) => s.id === this.currentStepId,
    );
    const stepIndex = this.lifecycleSteps.findIndex((s) => s.id === stepId);
    return stepIndex < currentIndex;
  }

  isStepCurrent(stepId: CanonicalPhase): boolean {
    return stepId === this.currentStepId;
  }

  isStepPending(stepId: CanonicalPhase): boolean {
    const currentIndex = this.lifecycleSteps.findIndex(
      (s) => s.id === this.currentStepId,
    );
    const stepIndex = this.lifecycleSteps.findIndex((s) => s.id === stepId);
    return stepIndex > currentIndex;
  }

  getCurrentStepLabel(): string {
    return (
      this.lifecycleSteps.find((s) => s.id === this.currentStepId)?.shortLabel || ''
    );
  }
}
