import { Component, OnInit } from '@angular/core';
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
    MatSnackBarModule
  ],
  templateUrl: './my-projects.component.html',
  styleUrls: ['./my-projects.component.scss']
})
export class MyProjectsComponent implements OnInit {
  isLoading = false;
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  projectFilter: "all" | "BIDDING" | "LIVE" | "DRAFT" | "FAILED" = "all";
  projectView: 'grid' | 'list' = 'grid';
  jobDisplayedColumns: string[] = ['project', 'created', 'progress', 'status', 'actions'];

  biddingProjectsCount = 0;
  liveProjectsCount = 0;
  draftProjectsCount = 0;
  failedProjectsCount = 0;

  constructor(
    private router: Router,
    private jobDataService: JobDataService,
    private snackBar: MatSnackBar,
    private projectService: ProjectService
  ) { }

  ngOnInit(): void {
    this.projectService.projects$.subscribe(projects => {
      this.projects = projects;
      this.updateCounts();
      this.setProjectFilter(this.projectFilter);
    });
    this.projectService.isLoading.subscribe(isLoading => this.isLoading = isLoading);
    this.projectService.loadProjects();
  }

  updateCounts(): void {
    this.biddingProjectsCount = this.projects.filter(p => p.status === 'BIDDING').length;
    this.liveProjectsCount = this.projects.filter(p => p.status === 'LIVE').length;
    this.draftProjectsCount = this.projects.filter(p => p.status === 'DRAFT').length;
    this.failedProjectsCount = this.projects.filter(p => p.status === 'FAILED').length;
  }

  setProjectFilter(filter: "all" | "BIDDING" | "LIVE" | "DRAFT" | "FAILED"): void {
    this.projectFilter = filter;
    if (filter === 'all') {
      this.filteredProjects = this.projects;
    } else {
      this.filteredProjects = this.projects.filter(p => p.status === filter);
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
    console.log('Delete project:', jobId);
  }

  activateProject(jobId: number): void {
    // TODO: Implement activate logic, start the bidding process
    console.log('Activate project:', jobId);
  }

  archiveProject(jobId: number): void {
    this.projectService.archiveProject(jobId);
    this.snackBar.open('Project archived successfully', 'Close', { duration: 3000 });
  }

  uploadThumbnail(event: { jobId: number, file: File }): void {
    this.projectService.uploadThumbnail(event.jobId, event.file);
  }

  toggleProjectView(view: 'grid' | 'list') {
    this.projectView = view;
  }
}
