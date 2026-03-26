import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, tap, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { JobsService, UploadThumbnailResponse } from './jobs.service';
import { AuthService } from '../authentication/auth.service';
import { TeamManagementService } from './team-management.service';
import { Project } from '../models/project';
import { ArchiveService } from '../features/archive/archive-service';

@Injectable({
  providedIn: 'root',
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
    'assets/job-card/shopping-mall-renovation.jpg',
  ];

  constructor(
    private jobsService: JobsService,
    private authService: AuthService,
    private teamManagementService: TeamManagementService,
    private archiveService: ArchiveService,
  ) {}

  patchProject(jobId: number, patch: Partial<Project>): void {
    const currentProjects = this.projects.getValue();
    const projectIndex = currentProjects.findIndex(
      (p) => Number(p.jobId) === Number(jobId),
    );

    if (projectIndex === -1) {
      return;
    }

    const updatedProjects = [...currentProjects];
    updatedProjects[projectIndex] = {
      ...updatedProjects[projectIndex],
      ...patch,
    };

    this.projects.next(updatedProjects);

    const userId = this.authService.getUserId();
    if (userId) {
      localStorage.setItem(`projects_${userId}`, JSON.stringify(updatedProjects));
    }
  }

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

    this.authService.currentUser$
      .pipe(
        switchMap((user) => {
          if (!user) {
            this.isLoading.next(false);
            return of([]);
          }
          return this.jobsService.getUserDashboard(user.id);
        }),
      )
      .subscribe({
        next: (projects: any[]) => {
          const existingProjects = this.projects.getValue();

          const mappedProjects = projects.map((p) => {
            const existing = existingProjects.find(
              (ep) => Number(ep.jobId) === Number(p.jobId),
            );

            const shouldPreserveExistingProgress =
              p.status === 'ANALYZING' &&
              existing?.progress !== undefined &&
              (p.progress === undefined || p.progress === 0);

            return {
              ...p,
              // Preserve locally-maintained fields so UI doesn't flicker between refreshes
              progress: shouldPreserveExistingProgress
                ? existing?.progress
                : (p.progress ?? existing?.progress),
              thumbnailUrl:
                p.thumbnailUrl || existing?.thumbnailUrl || this.getImageForJob(p.jobId),
            };
          });

          this.projects.next(mappedProjects);
          // console.log('Loaded projects:', mappedProjects);
          if (userId) {
            localStorage.setItem(
              `projects_${userId}`,
              JSON.stringify(mappedProjects),
            );
          }
          this.isLoading.next(false);
        },
        error: (err) => {
          console.error('Failed to load projects', err);
          this.isLoading.next(false);
        },
      });
  }

  private getImageForJob(jobId: number): string {
    const projects = this.projects.getValue();
    const project = projects.find((p) => p.jobId === jobId);
    if (project && project.thumbnailUrl) {
      return project.thumbnailUrl;
    }
    const randomIndex = jobId % this.jobCardImages.length;
    return this.jobCardImages[randomIndex];
  }

  archiveProject(jobId: number): void {
    this.archiveService.archiveJob(jobId).subscribe(() => {
      const currentProjects = this.projects.getValue();
      const updatedProjects = currentProjects.filter((p) => p.jobId !== jobId);
      this.projects.next(updatedProjects);
    });
  }

  uploadThumbnail(
    jobId: number,
    file: File,
  ): Observable<UploadThumbnailResponse> {
    return this.jobsService.uploadJobThumbnail(jobId, file).pipe(
      tap((response) => {
        const currentProjects = this.projects.getValue();
        const projectIndex = currentProjects.findIndex((p) => p.jobId === jobId);
        if (projectIndex > -1) {
          const updatedProjects = [...currentProjects];
          updatedProjects[projectIndex] = {
            ...updatedProjects[projectIndex],
            thumbnailUrl: response.thumbnailUrl,
          };
          this.projects.next(updatedProjects);

          const userId = this.authService.getUserId();
          if (userId) {
            localStorage.setItem(`projects_${userId}`, JSON.stringify(updatedProjects));
          }
        }
      }),
      catchError((error) => {
        console.error('Thumbnail upload failed', error);
        return throwError(() => error);
      }),
    );
  }
}
