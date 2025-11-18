import { Injectable } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { JobsService } from './jobs.service';
import { AuthService } from '../authentication/auth.service';
import { TeamManagementService } from './team-management.service';
import { Project } from '../features/my-projects/project-card/project-card.component';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private projects = new BehaviorSubject<Project[]>([]);
  projects$ = this.projects.asObservable();
  isLoading = new BehaviorSubject<boolean>(false);

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
    private teamManagementService: TeamManagementService
  ) { }

  loadProjects(): void {
    this.isLoading.next(true);
    const userId = this.authService.getUserId();
    if (userId) {
      const cachedProjects = localStorage.getItem(`projects_${userId}`);
      if (cachedProjects) {
        this.projects.next(JSON.parse(cachedProjects));
        this.isLoading.next(false);
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
          this.isLoading.next(false);
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
          this.isLoading.next(false);
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
              thumbnailUrl: details.thumbnailUrl || this.getImageForJob(job.id)
            };
            return project;
          }));

        Promise.all(jobDataPromises).then(projects => {
          this.projects.next(projects);
          if (userId) {
            localStorage.setItem(`projects_${userId}`, JSON.stringify(projects));
          }
          this.isLoading.next(false);
        });

        return of([]);
      })
    ).subscribe({
      error: () => this.isLoading.next(false)
    });
  }

  private calculateJobProgress(subtasks: any[]): number {
    if (!subtasks || subtasks.length === 0) {
      return 0;
    }
    const completedDays = subtasks
      .filter(st => st.status?.toLowerCase() === 'completed')
      .reduce((sum, st) => sum + st.days, 0);

    const totalDays = subtasks.reduce((sum, st) => sum + st.days, 0);

    return totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  }

  private getImageForJob(jobId: number): string {
    const projects = this.projects.getValue();
    const project = projects.find(p => p.jobId === jobId);
    if (project && project.thumbnailUrl) {
      return project.thumbnailUrl;
    }
    const randomIndex = jobId % this.jobCardImages.length;
    return this.jobCardImages[randomIndex];
  }

  archiveProject(jobId: number): void {
    this.jobsService.archiveJob(jobId).subscribe(() => {
      const currentProjects = this.projects.getValue();
      const updatedProjects = currentProjects.filter(p => p.jobId !== jobId);
      this.projects.next(updatedProjects);
    });
  }

  uploadThumbnail(jobId: number, file: File): void {
    this.jobsService.uploadJobThumbnail(jobId, file).subscribe(response => {
      const currentProjects = this.projects.getValue();
      const projectIndex = currentProjects.findIndex(p => p.jobId === jobId);
      if (projectIndex > -1) {
        const updatedProjects = [...currentProjects];
        updatedProjects[projectIndex] = { ...updatedProjects[projectIndex], thumbnailUrl: response.thumbnailUrl };
        this.projects.next(updatedProjects);
      }
    });
  }
}
