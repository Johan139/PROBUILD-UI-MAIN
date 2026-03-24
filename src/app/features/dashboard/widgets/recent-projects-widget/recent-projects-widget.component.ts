import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProjectCardComponent } from '../../../my-projects/project-card/project-card.component';
import { ProjectsTableComponent } from '../../../../components/projects-table/projects-table.component';
import { Project } from '../../../../models/project';
import { ProjectService } from '../../../../services/project.service';
import { JobDataService } from '../../../jobs/services/job-data.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { ArchiveService } from '../../../archive/archive-service';

@Component({
  selector: 'app-recent-projects-widget',
  standalone: true,
  templateUrl: './recent-projects-widget.component.html',
  styleUrls: ['./recent-projects-widget.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,
    ProjectCardComponent,
    ProjectsTableComponent,
  ],
})
export class RecentProjectsWidgetComponent {
  projects: Project[] = [];
  currentIndex = 0;
  projectView: 'grid' | 'list' = 'grid';
  @Output() jobArchived = new EventEmitter<number>();
  constructor(
    private projectService: ProjectService,
    private jobDataService: JobDataService,
    private snackBar: MatSnackBar,
    private archiveService: ArchiveService,
  ) {
    this.projectService.projects$.subscribe(
      (projects) => (this.projects = projects),
    );
  }

  get visibleProjects() {
    return this.projects.slice(this.currentIndex, this.currentIndex + 5);
  }

  nextProject() {
    if (this.currentIndex < this.projects.length - 5) {
      this.currentIndex++;
    }
  }

  prevProject() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  toggleProjectView(view: 'grid' | 'list') {
    this.projectView = view;
  }

  loadJob(id: number) {
    this.jobDataService.navigateToJob({ jobId: id });
  }

  uploadThumbnail(event: { jobId: number; file: File }): void {
    this.projectService.uploadThumbnail(event.jobId, event.file).subscribe({
      next: () => {
        this.snackBar.open('Thumbnail uploaded successfully', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        console.error('Thumbnail upload failed in recent projects widget', err);
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

  archiveJob(jobId: number): void {
    this.archiveService.archiveJob(jobId).subscribe({
      next: () => {
        // Immediately remove from local array for instant UI update
        const beforeLength = this.projects.length;

        this.projects = this.projects.filter((p) => {
          const projectJobId = Number(p.jobId);
          return projectJobId !== jobId;
        });

        // Reset carousel index if needed to prevent empty view
        if (this.currentIndex >= this.projects.length - 2) {
          this.currentIndex = Math.max(0, this.projects.length - 3);
        }

        // Emit to parent so it can refresh from server (ensures consistency)
        this.jobArchived.emit(jobId);

        this.snackBar.open('Job archived successfully!', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        console.error('Failed to archive Job', err);
        alert(err?.error ?? 'Failed to archive Job');
      },
    });
  }
}
