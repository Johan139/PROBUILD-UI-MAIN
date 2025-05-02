import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-job-selection',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatListModule,
    MatProgressSpinnerModule,
    FormsModule,
  ],
  templateUrl: './job-selection.component.html',
  styleUrls: ['./job-selection.component.scss'],
})
export class JobSelectionComponent implements OnInit {
  jobs: any[] = [];
  selectedJob: any = null;
  subtaskGroups: { title: string; subtasks: any[] }[] = [];
  selectedSubtasks: any[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';

  // Dummy data for jobs
  private dummyJobs = [
    {
      Id: '1',
      ProjectName: 'Residential Build A',
      FoundationSubtask: JSON.stringify([
        { task: 'Concrete Pouring', cost: 5000 },
        { task: 'Footing Installation', cost: 3000 },
      ]),
      WallInsulationSubtask: JSON.stringify([
        { task: 'Fiberglass Insulation', cost: 2000 },
      ]),
      WallStructureSubtask: JSON.stringify([
        { task: 'Wood Framing', cost: 4000 },
      ]),
      ElectricalSupplyNeedsSubtask: JSON.stringify([
        { task: 'Wiring Installation', cost: 2500 },
      ]),
      RoofInsulationSubtask: JSON.stringify([
        { task: 'Spray Foam Insulation', cost: 1800 },
      ]),
      RoofStructureSubtask: JSON.stringify([
        { task: 'Truss Installation', cost: 3500 },
      ]),
      FinishesSubtask: JSON.stringify([
        { task: 'Drywall Installation', cost: 2200 },
        { task: 'Painting', cost: 1500 },
      ]),
    },
    {
      Id: '2',
      ProjectName: 'Commercial Complex B',
      FoundationSubtask: JSON.stringify([
        { task: 'Slab Foundation', cost: 8000 },
      ]),
      WallInsulationSubtask: JSON.stringify([
        { task: 'Batt Insulation', cost: 2500 },
      ]),
      WallStructureSubtask: JSON.stringify([
        { task: 'Steel Framing', cost: 6000 },
      ]),
      ElectricalSupplyNeedsSubtask: JSON.stringify([
        { task: 'Commercial Wiring', cost: 4000 },
      ]),
      RoofInsulationSubtask: JSON.stringify([
        { task: 'Rigid Board Insulation', cost: 2000 },
      ]),
      RoofStructureSubtask: JSON.stringify([
        { task: 'Flat Roof Installation', cost: 5000 },
      ]),
      FinishesSubtask: JSON.stringify([
        { task: 'Acoustic Ceiling', cost: 3000 },
      ]),
    },
  ];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchJobs();
  }

  fetchJobs(): void {
    this.isLoading = true;
    // Simulate API call with dummy data
    setTimeout(() => {
      this.jobs = this.dummyJobs;
      this.isLoading = false;
    }, 500); // Simulate network delay
  }

  selectJob(job: any): void {
    this.selectedJob = job;
    this.selectedSubtasks = [];
    this.fetchSubtasksForJob(job);
    this.cdr.detectChanges(); // Ensure UI updates
  }

  fetchSubtasksForJob(job: any): void {
    // Construct subtask groups based on job data
    this.subtaskGroups = [
      { title: 'Foundation Subtasks', subtasks: JSON.parse(job.FoundationSubtask || '[]') },
      { title: 'Wall Insulation Subtasks', subtasks: JSON.parse(job.WallInsulationSubtask || '[]') },
      { title: 'Wall Structure Subtasks', subtasks: JSON.parse(job.WallStructureSubtask || '[]') },
      { title: 'Electrical Supply Needs Subtasks', subtasks: JSON.parse(job.ElectricalSupplyNeedsSubtask || '[]') },
      { title: 'Roof Insulation Subtasks', subtasks: JSON.parse(job.RoofInsulationSubtask || '[]') },
      { title: 'Roofing Subtasks', subtasks: JSON.parse(job.RoofStructureSubtask || '[]') },
      { title: 'Finishes Subtasks', subtasks: JSON.parse(job.FinishesSubtask || '[]') },
    ].map((group) => ({
      ...group,
      subtasks: group.subtasks.map((subtask: any) => ({
        ...subtask,
        selected: false,
      })),
    }));
  }

  toggleSubtaskSelection(subtask: any): void {
    subtask.selected = !subtask.selected;
    if (subtask.selected) {
      this.selectedSubtasks.push({ ...subtask });
    } else {
      this.selectedSubtasks = this.selectedSubtasks.filter(
        (s) => s.task !== subtask.task
      );
    }
    console.log('Selected Subtasks:', this.selectedSubtasks); // Debug log
    this.cdr.detectChanges(); // Force change detection
  }

  proceedToQuote(): void {
    if (this.selectedSubtasks.length === 0) {
      this.errorMessage = 'Please select at least one subtask to quote.';
      return;
    }

    // Prepare data to pass to the quote component
    const quoteItems = this.selectedSubtasks.map((subtask) => ({
      description: subtask.task,
      quantity: 1,
      unitPrice: subtask.cost || 0,
      total: (subtask.cost || 0).toString(),
    }));

    // Navigate to the quote page with the selected subtasks
    this.router.navigate(['/quote'], {
      queryParams: {
        jobId: this.selectedJob.Id,
        projectName: this.selectedJob.ProjectName,
        quoteItems: JSON.stringify(quoteItems),
      },
    });
  }
}