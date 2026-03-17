import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ProjectCardComponent } from './project-card/project-card.component';
import { Project } from '../../models/project';
import { JobDataService } from '../jobs/services/job-data.service';
import { LoaderComponent } from '../../loader/loader.component';
import { ProjectService } from '../../services/project.service';
import { ProjectsTableComponent } from '../../components/projects-table/projects-table.component';
import {
  SignalrService,
  AnalysisProgressUpdate,
} from '../jobs/services/signalr.service';
import { Subscription, interval } from 'rxjs';
import { startWith } from 'rxjs/operators';

@Component({
  selector: 'app-my-projects',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatMenuModule,
    ProjectCardComponent,
    ProjectsTableComponent,
    LoaderComponent,
    MatSnackBarModule,
  ],
  templateUrl: './my-projects.component.html',
  styleUrls: ['./my-projects.component.scss'],
})
export class MyProjectsComponent implements OnInit, OnDestroy {
  isLoading = false;
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  projectFilter: 'all' | 'BIDDING' | 'LIVE' | 'DRAFT' | 'FAILED' = 'all';
  projectView: 'grid' | 'list' = 'grid';
  jobDisplayedColumns: string[] = [
    'project',
    'created',
    'progress',
    'status',
    'actions',
  ];

  biddingProjectsCount = 0;
  liveProjectsCount = 0;
  draftProjectsCount = 0;
  failedProjectsCount = 0;

  private analysisProgressSubscription?: Subscription;
  private analysisStatePollingSubscription?: Subscription;

  constructor(
    private router: Router,
    private jobDataService: JobDataService,
    private snackBar: MatSnackBar,
    private projectService: ProjectService,
    private signalrService: SignalrService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.projectService.projects$.subscribe((projects) => {
      this.projects = projects;
      this.updateCounts();
      this.setProjectFilter(this.projectFilter);
    });
    this.projectService.isLoading.subscribe(
      (isLoading) => (this.isLoading = isLoading),
    );
    this.projectService.loadProjects();

    // SignalR Integration for Auto-Updates
    this.signalrService.startConnection();
    this.analysisProgressSubscription = this.signalrService.analysisProgress.subscribe(
      (update: AnalysisProgressUpdate) => {
        this.ngZone.run(() => {
          this.applyAnalysisUpdate(update.jobId, update);
        });
      },
    );

    this.startAnalysisStatePolling();
  }

  ngOnDestroy(): void {
    this.analysisProgressSubscription?.unsubscribe();
    this.analysisStatePollingSubscription?.unsubscribe();
  }

  private startAnalysisStatePolling(): void {
    this.analysisStatePollingSubscription = interval(5000)
      .pipe(startWith(0))
      .subscribe(() => {
        const analyzingProjects = this.projects.filter(
          (project) => project.status === 'ANALYZING',
        );

        analyzingProjects.forEach((project) => {
          this.signalrService
            .getAnalysisState(Number(project.jobId))
            .subscribe((state) => {
              if (!state) {
                return;
              }

              this.ngZone.run(() => {
                this.applyAnalysisUpdate(project.jobId, {
                  jobId: Number(project.jobId),
                  statusMessage: state.statusMessage || '',
                  currentStep: state.currentStep || 0,
                  totalSteps: state.totalSteps || 0,
                  isComplete: !!state.isComplete,
                  hasFailed: !!state.hasFailed,
                  errorMessage: state.errorMessage || '',
                });
              });
            });
        });
      });
  }

  private applyAnalysisUpdate(
    jobId: number,
    update: AnalysisProgressUpdate,
  ): void {
    const projectIndex = this.projects.findIndex(
      (p) => Number(p.jobId) === Number(jobId),
    );

    if (projectIndex === -1) {
      return;
    }

    const currentProject = this.projects[projectIndex];
    const updatedProject = { ...currentProject };

    if (update.totalSteps > 0) {
      updatedProject.progress = Math.round(
        (update.currentStep / update.totalSteps) * 100,
      );
    }

    if (update.isComplete) {
      const wasComplete = currentProject.status === 'PRELIMINARY';
      updatedProject.status = 'PRELIMINARY';
      updatedProject.progress = 100;

      if (!wasComplete) {
        this.snackBar
          .open(`Analysis complete for ${updatedProject.projectName}`, 'View', {
            duration: 5000,
          })
          .onAction()
          .subscribe(() => {
            this.viewProject(updatedProject.jobId);
          });
      }
    }

    this.projects = this.projects.map((project, index) =>
      index === projectIndex ? updatedProject : project,
    );

    this.updateCounts();
    this.setProjectFilter(this.projectFilter);
    this.cdr.detectChanges();
  }

  updateCounts(): void {
    this.biddingProjectsCount = this.projects.filter(
      (p) => p.status === 'BIDDING',
    ).length;
    this.liveProjectsCount = this.projects.filter(
      (p) => p.status === 'LIVE',
    ).length;
    this.draftProjectsCount = this.projects.filter(
      (p) =>
        p.status === 'DRAFT' ||
        p.status === 'PRELIMINARY' ||
        p.status === 'NEW' ||
        p.status === 'ANALYZING',
    ).length;
    this.failedProjectsCount = this.projects.filter(
      (p) => p.status === 'FAILED',
    ).length;
  }

  setProjectFilter(
    filter: 'all' | 'BIDDING' | 'LIVE' | 'DRAFT' | 'FAILED',
  ): void {
    this.projectFilter = filter;
    if (filter === 'all') {
      this.filteredProjects = this.projects;
    } else if (filter === 'DRAFT') {
      this.filteredProjects = this.projects.filter(
        (p) =>
          p.status === 'DRAFT' ||
          p.status === 'PRELIMINARY' ||
          p.status === 'NEW' ||
          p.status === 'ANALYZING',
      );
    } else {
      this.filteredProjects = this.projects.filter((p) => p.status === filter);
    }
  }

  createNewProject(): void {
    this.router.navigate(['/new-project']);
  }

  viewProject(jobId: number): void {
    this.jobDataService.navigateToJob({ jobId: jobId });
  }

  editProject(jobId: number): void {
    // TODO: Need to make a good editing dialog or details page for this, could add to the jobs.component like the example? Details | Timeline | Team Members | Whatever ?
    this.router.navigate(['/edit-project', jobId]);
  }

  deleteProject(jobId: number): void {
    // TODO: Should be archiving instead of deleting
    void jobId;
  }

  activateProject(jobId: number): void {
    // TODO: Implement activate logic, start the bidding process
    void jobId;
  }

  archiveProject(jobId: number): void {
    this.projectService.archiveProject(jobId);
    this.snackBar.open('Project archived successfully', 'Close', {
      duration: 3000,
    });
  }

  uploadThumbnail(event: { jobId: number; file: File }): void {
    this.projectService.uploadThumbnail(event.jobId, event.file).subscribe({
      next: () => {
        this.snackBar.open('Thumbnail uploaded successfully', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        console.error('Thumbnail upload failed in component', err);
        this.snackBar.open(
          'Thumbnail upload failed. Please try again.',
          'Close',
          {
            duration: 4000,
          },
        );
      },
    });
  }

  toggleProjectView(view: 'grid' | 'list') {
    this.projectView = view;
  }
}
