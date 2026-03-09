import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { JobAnalysisWalkthroughComponent } from './job-analysis-walkthrough.component';

@Component({
  selector: 'app-phase-initiation',
  standalone: true,
  imports: [CommonModule, JobAnalysisWalkthroughComponent],
  template: `
    <app-job-analysis-walkthrough
      [jobId]="jobId"
      (continue)="continue.emit()"
    ></app-job-analysis-walkthrough>
  `,
})
export class PhaseInitiationComponent {
  @Input() jobId!: number;
  @Output() continue = new EventEmitter<void>();
}

