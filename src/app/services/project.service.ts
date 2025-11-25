import { Injectable } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { JobsService } from './jobs.service';
import { AuthService } from '../authentication/auth.service';
import { TeamManagementService } from './team-management.service';
import { Project } from '../models/project';

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

    this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          this.isLoading.next(false);
          return of([]);
        }
        return this.jobsService.getUserDashboard(user.id);
      })
    ).subscribe({
      next: (projects: any[]) => {
        const mappedProjects = projects.map(p => ({
          ...p,
          thumbnailUrl: p.thumbnailUrl || this.getImageForJob(p.jobId)
        }));

        this.projects.next(mappedProjects);
        console.log('Loaded projects:', mappedProjects);
        if (userId) {
          localStorage.setItem(`projects_${userId}`, JSON.stringify(mappedProjects));
        }
        this.isLoading.next(false);
      },
      error: (err) => {
        console.error('Failed to load projects', err);
        this.isLoading.next(false);
      }
    });
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
