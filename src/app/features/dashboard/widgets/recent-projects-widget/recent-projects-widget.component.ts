import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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

  constructor(
    private projectService: ProjectService,
    private jobDataService: JobDataService,
    private snackBar: MatSnackBar,
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
    this.jobDataService.navigateToJob({ jobId: id }, 'MM/dd/yyyy');
  }

  archiveJob(jobId: number): void {
    this.projectService.archiveProject(jobId);
    this.snackBar.open('Job archived successfully!', 'Close', {
      duration: 3000,
    });
  }
}
