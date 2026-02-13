import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Upload, ClipboardList, Gavel, Play, FolderCheck, CheckCircle2 } from 'lucide-angular';

@Component({
  selector: 'app-project-stage-stepper',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './project-stage-stepper.component.html',
  styleUrls: ['./project-stage-stepper.component.scss']
})
export class ProjectStageStepperComponent implements OnChanges {
  @Input() currentStage: 'ANALYZING' | 'NEW' | 'PRELIMINARY' | 'BIDDING' | 'LIVE' | 'CLOSURE' = 'ANALYZING';

  lifecycleSteps = [
    { id: 'new-project', label: 'New Project', icon: Upload, description: 'Upload Blueprints', mappedStatus: ['ANALYZING', 'NEW'] },
    { id: 'preliminary', label: 'Preliminary', icon: ClipboardList, description: 'Review & Planning', mappedStatus: ['PRELIMINARY'] },
    { id: 'inbound-bidding', label: 'Inbound Bidding', icon: Gavel, description: 'Collect Bids', mappedStatus: ['BIDDING'] },
    { id: 'live', label: 'Live', icon: Play, description: 'Active Construction', mappedStatus: ['LIVE', 'ACTIVE'] },
    { id: 'closure', label: 'Project Closure', icon: FolderCheck, description: 'Final Handover', mappedStatus: ['CLOSURE', 'ARCHIVED'] },
  ];

  currentStepId: string = 'new-project';
  progressWidth: string = '0%';

  Upload = Upload;
  ClipboardList = ClipboardList;
  Gavel = Gavel;
  Play = Play;
  FolderCheck = FolderCheck;
  CheckCircle2 = CheckCircle2;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStage']) {
      this.updateProgress();
    }
  }

  private updateProgress() {
    const stage = this.currentStage ? this.currentStage.toUpperCase() : 'ANALYZING';

    // Find the step index based on the status mapping
    const stepIndex = this.lifecycleSteps.findIndex(step => step.mappedStatus.includes(stage));

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

  getStepIcon(stepId: string) {
    const step = this.lifecycleSteps.find(s => s.id === stepId);
    return step ? step.icon : Upload;
  }

  isStepCompleted(stepId: string): boolean {
    const currentIndex = this.lifecycleSteps.findIndex(s => s.id === this.currentStepId);
    const stepIndex = this.lifecycleSteps.findIndex(s => s.id === stepId);
    return stepIndex < currentIndex;
  }

  isStepCurrent(stepId: string): boolean {
    return stepId === this.currentStepId;
  }

  isStepPending(stepId: string): boolean {
    const currentIndex = this.lifecycleSteps.findIndex(s => s.id === this.currentStepId);
    const stepIndex = this.lifecycleSteps.findIndex(s => s.id === stepId);
    return stepIndex > currentIndex;
  }

  getCurrentStepLabel(): string {
    return this.lifecycleSteps.find(s => s.id === this.currentStepId)?.label || '';
  }
}
