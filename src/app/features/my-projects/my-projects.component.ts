import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { JobsService } from '../../services/jobs.service';
import { AuthService } from '../../authentication/auth.service';
import { ProjectCardComponent, Project } from './project-card/project-card.component';
import { JobDataService } from '../jobs/services/job-data.service';
import { TeamManagementService } from '../../services/team-management.service';
import { BomService } from '../jobs/services/bom.service';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LoaderComponent } from '../../loader/loader.component';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-my-projects',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ProjectCardComponent,
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

  biddingProjectsCount = 0;
  liveProjectsCount = 0;
  draftProjectsCount = 0;
  failedProjectsCount = 0;

  private jobCardImages = [
    'assets/job-card/community-center.png',
    'assets/job-card/construction-blueprint.png',
    'assets/job-card/industrial-warehouse-construction.png',
    'assets/job-card/modern-office-building-construction.jpg',
    'assets/job-card/residential-tower-construction.jpg',
    'assets/job-card/shopping-mall-renovation.jpg'
  ];

  constructor(
    private jobsService: JobsService,
    private authService: AuthService,
    private router: Router,
    private jobDataService: JobDataService,
    private teamManagementService: TeamManagementService,
    private bomService: BomService,
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
}
