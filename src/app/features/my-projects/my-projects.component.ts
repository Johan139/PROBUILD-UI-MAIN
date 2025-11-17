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
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadProjects();
  }

  calculateJobProgress(subtasks: any[]): number {
    if (!subtasks || subtasks.length === 0) {
      return 0;
    }
    const completedDays = subtasks
      .filter(st => st.status?.toLowerCase() === 'completed')
      .reduce((sum, st) => sum + st.days, 0);

    const totalDays = subtasks.reduce((sum, st) => sum + st.days, 0);

    return totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  }

  loadProjects(): void {
    this.isLoading = true;
    const userId = this.authService.getUserId();
    if (userId) {
      const cachedProjects = localStorage.getItem(`projects_${userId}`);
      if (cachedProjects) {
        this.projects = JSON.parse(cachedProjects);
        this.updateCounts();
        this.setProjectFilter('all');
        this.isLoading = false;
      }
    }

    const isTeamMember = this.authService.isTeamMember();
    this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        return isTeamMember
          ? this.jobsService.getAssignedJobsForTeamMember(user.id)
          : this.jobsService.getAllJobsByUserId(user.id);
      }),
      switchMap(jobs => {
        if (!jobs || jobs.length === 0) {
          this.isLoading = false;
          return of([]);
        }

        const nonArchivedJobs = jobs.filter(job => job.status !== 'ARCHIVED');

        const uniqueJobsMap = new Map<number, any>();
        nonArchivedJobs.forEach(job => {
          if (!uniqueJobsMap.has(job.id)) {
            uniqueJobsMap.set(job.id, job);
          }
        });

        const uniqueJobs = Array.from(uniqueJobsMap.values());
        if (uniqueJobs.length === 0) {
          this.isLoading = false;
          return of([]);
        }

        const jobDataPromises = uniqueJobs
          .filter(job => job && job.id)
          .map(job => Promise.all([
            this.jobsService.getSpecificJob(job.id.toString()).toPromise(),
            this.jobsService.getJobSubtasks(job.id).toPromise(),
            this.teamManagementService.getTeamMembers(job.id.toString()).toPromise()
          ]).then(([details, subtasks, teamMembers]) => {
            const project: Project = {
              ...details,
              progress: this.calculateJobProgress(subtasks || []),
              team: (teamMembers || []).length,
              thumbnailUrl: this.getImageForJob(job.id)
            };
            return project;
          }));

        Promise.all(jobDataPromises).then(projects => {
          this.projects = projects;
          this.updateCounts();
          this.setProjectFilter('all');
          if (userId) {
            localStorage.setItem(`projects_${userId}`, JSON.stringify(projects));
          }
          this.isLoading = false;
        });

        return of([]); // Return an empty observable to satisfy the switchMap
      })
    ).subscribe({
      error: () => this.isLoading = false
    });
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
    this.jobsService.archiveJob(jobId).subscribe(() => {
      this.projects = this.projects.filter(p => p.jobId !== jobId);
      this.filteredProjects = this.filteredProjects.filter(p => p.jobId !== jobId);
      this.updateCounts();
      this.snackBar.open('Project archived successfully', 'Close', { duration: 3000 });
    });
  }

  private getImageForJob(jobId: number): string {
    const randomIndex = jobId % this.jobCardImages.length;
    return this.jobCardImages[randomIndex];
  }
}
