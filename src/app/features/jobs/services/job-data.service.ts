import { Injectable } from '@angular/core';
import { JobsService } from '../../../services/jobs.service';
import { WeatherService } from '../../../services/weather.service';
import { Store } from '../../../store/store.service';
import { SubtasksState } from '../../../state/subtasks.state';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  catchError,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { JobNavigationService } from './jobs/job-navigation.service';
import { JobSubtaskService } from './jobs/job-subtask.service';
import { JobParserService } from './jobs/job-parser.service';
import { JobCacheService } from './jobs/job-cache.service';
import { JobWeatherService } from './jobs/job-weather.service';
import { JobLoadResult } from '../../../types/jobs/job-data.types';
import { GroupedSubtask, RawSubtask } from '../../../models/job-domain.models';

@Injectable({
  providedIn: 'root',
})
export class JobDataService {
  constructor(
    private jobsService: JobsService,
    private jobWeather: JobWeatherService,
    private store: Store<SubtasksState>,
    private snackBar: MatSnackBar,
    private jobNavigation: JobNavigationService,
    private jobParser: JobParserService,
    private jobCache: JobCacheService,
    private jobSubtasks: JobSubtaskService,
  ) {}

  getJobDetails(jobId: string, projectDetails: any) {
    return this.jobsService.getSpecificJob(jobId).pipe(
      tap((jobDetails) => {
        const updatedProjectDetails = { ...projectDetails, ...jobDetails };
        if (jobDetails.address) {
          updatedProjectDetails.address = jobDetails.address;
        }

        const latCandidate =
          jobDetails.latitude ??
          jobDetails?.jobAddress?.geometry?.location?.lat ??
          jobDetails?.jobAddress?.geometry?.location?.latitude;
        const lonCandidate =
          jobDetails.longitude ??
          jobDetails?.jobAddress?.geometry?.location?.lng ??
          jobDetails?.jobAddress?.geometry?.location?.longitude;

        if (latCandidate != null && lonCandidate != null) {
          updatedProjectDetails.latitude = latCandidate;
          updatedProjectDetails.longitude = lonCandidate;
        }
        this.store.setState({ projectDetails: updatedProjectDetails });
        if (updatedProjectDetails.latitude && updatedProjectDetails.longitude) {
          this.jobWeather
            .loadWeather(
              parseFloat(updatedProjectDetails.latitude),
              parseFloat(updatedProjectDetails.longitude),
            )
            .subscribe();
        }
      }),
      catchError((err) => {
        console.error('Failed to load job details', err);
        this.snackBar.open('Failed to refresh job details.', 'Close', {
          duration: 3000,
        });
        return throwError(() => err);
      }),
    );
  }

  fetchJobData(projectDetails: any) {
    return this.loadJobDataFlow(projectDetails);
  }

  private loadJobDataFlow(projectDetails: any) {
    return this.getJobDetails(projectDetails.jobId, projectDetails).pipe(
      switchMap(() => this.loadWeatherFromStore()),

      tap(() => this.loadCache(projectDetails.jobId)),

      switchMap(() => this.loadSubtasksOrBom(projectDetails.jobId)),

      tap((result: JobLoadResult) =>
        this.applySubtaskOrBomResult(result, projectDetails.jobId),
      ),

      map(() => void 0),
    );
  }
  private applySubtaskOrBomResult(result: any, jobId: string): void {
    const subtasksStorageKey = `subtasks_${jobId}`;
    const materialsStorageKey = `materials_${jobId}`;

    // --------------------
    // SUBTASK PATH
    // --------------------
    if (result.source === 'subtasks') {
      const grouped = this.jobSubtasks.groupSubtasksByTitle(result.data);

      this.store.setState({ subtaskGroups: grouped });
      this.jobCache.set(subtasksStorageKey, grouped);
    }

    // --------------------
    // BOM PATH
    // --------------------
    if (result.source === 'bom' && result.markdown) {
      const parsedGroups = this.jobParser.parseTimelineToTaskGroups(
        result.markdown,
      );

      this.store.setState({ subtaskGroups: parsedGroups });
      this.jobCache.set(subtasksStorageKey, parsedGroups);

      const materialGroups = this.jobParser.extractMaterialGroups(
        result.markdown,
      );

      this.store.setState({ materialGroups });

      if (materialGroups.length > 0) {
        this.jobCache.set(materialsStorageKey, materialGroups);
      }

      // --------------------
      // FLAGS
      // --------------------
      try {
        const jsonMatch = result.markdown.match(/```json([\s\S]*?)```/);

        if (jsonMatch && jsonMatch[1]) {
          const parsedJson = JSON.parse(jsonMatch[1]);

          const currentDetails = this.store.getState().projectDetails;
          const newDetails = { ...currentDetails };

          if (parsedJson.isSelected === 'true') {
            newDetails.isSelected = true;
          }

          if (parsedJson.isRenovation === 'true') {
            newDetails.isRenovation = true;
          }

          this.store.setState({ projectDetails: newDetails });
        }
      } catch (e) {
        console.error('Error parsing isSelected flag:', e);
      }
    }
  }

  groupSubtasksByTitle(subtasks: RawSubtask[]): GroupedSubtask[] {
    const groupedMap = new Map<string, any[]>();

    for (const st of subtasks) {
      const group = groupedMap.get(st.groupTitle) || [];
      const formatDate = (date: string) => {
        if (!date) return '';
        return new Date(date).toISOString().split('T')[0];
      };

      group.push({
        id: st.id,
        task: this.cleanTaskName(st.task ?? st.taskName ?? ''),
        days: st.days,
        startDate: formatDate(st.startDate ?? ''),
        endDate: formatDate(st.endDate ?? ''),
        status: st.status ?? 'Pending',
        cost: st.cost ?? 0,
        deleted: st.deleted ?? false,
      });
      groupedMap.set(st.groupTitle, group);
    }
    return Array.from(groupedMap.entries()).map(([title, subtasks]) => {
      const completedCount = subtasks.filter(
        (s) => s.status && s.status.toLowerCase() === 'completed',
      ).length;
      const progress =
        subtasks.length > 0
          ? Math.round((completedCount / subtasks.length) * 100)
          : 0;
      return {
        title: this.cleanTaskName(title),
        subtasks,
        progress,
      };
    });
  }
  private loadCache(jobId: string): void {
    const subtasksStorageKey = `subtasks_${jobId}`;
    const materialsStorageKey = `materials_${jobId}`;

    const cachedSubtasks = this.jobCache.get<any[]>(subtasksStorageKey);
    if (cachedSubtasks) {
      this.store.setState({ subtaskGroups: cachedSubtasks });
    }

    const cachedMaterials = this.jobCache.get<any[]>(materialsStorageKey);
    if (cachedMaterials) {
      this.store.setState({ materialGroups: cachedMaterials });
    }
  }
  private loadWeatherFromStore() {
    const details = this.store.getState().projectDetails;

    if (!details?.latitude || !details?.longitude) {
      return of(null);
    }

    return this.jobWeather.loadWeather(
      parseFloat(details.latitude),
      parseFloat(details.longitude),
    );
  }
  private loadSubtasksOrBom(jobId: number): Observable<JobLoadResult> {
    return this.jobsService.getJobSubtasks(jobId).pipe(
      switchMap((data: RawSubtask[]) => {
        if (!data || data.length === 0) {
          return this.fetchBom(jobId.toString());
        }

        return of<JobLoadResult>({
          source: 'subtasks',
          data,
        });
      }),
      catchError((err: any) => {
        if (err.status === 404) {
          return this.fetchBom(jobId.toString());
        }

        return throwError(() => err);
      }),
    );
  }

  private fetchBom(jobId: string): Observable<JobLoadResult> {
    return this.jobsService.GetBillOfMaterials(jobId).pipe(
      map((results: any) => ({
        source: 'bom',
        markdown: results[0]?.fullResponse ?? '',
      })),
    );
  }

  private cleanTaskName(name: string): string {
    if (typeof name === 'string') {
      return name.replace(/^\*\*|\*\*$/g, '').trim();
    }
    return name;
  }

  prepareProjectData(
    status: string,
    projectDetails: any,
    subtaskGroups: any[],
  ): any {
    const formattedDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      Id: projectDetails.jobId || 0,
      ProjectName: projectDetails.projectName || '',
      JobType: projectDetails.jobType || '',
      Qty: Number(projectDetails.quantity) || 1,
      DesiredStartDate: formattedDate(
        projectDetails.desiredStartDate
          ? new Date(projectDetails.desiredStartDate)
          : new Date(),
      ),
      WallStructure: projectDetails.wallStructure || '',
      WallStructureSubtask: JSON.stringify(subtaskGroups[2]?.subtasks || []),
      WallInsulation: projectDetails.wallInsulation || '',
      WallInsulationSubtask: JSON.stringify(subtaskGroups[1]?.subtasks || []),
      RoofStructure: projectDetails.roofStructure || '',
      RoofStructureSubtask: JSON.stringify(subtaskGroups[5]?.subtasks || []),
      RoofTypeSubtask: '',
      RoofInsulation: projectDetails.roofInsulation || '',
      RoofInsulationSubtask: JSON.stringify(subtaskGroups[4]?.subtasks || []),
      Foundation: projectDetails.foundation || '',
      FoundationSubtask: JSON.stringify(subtaskGroups[0]?.subtasks || []),
      Finishes: projectDetails.finishes || '',
      FinishesSubtask: JSON.stringify(subtaskGroups[6]?.subtasks || []),
      ElectricalSupplyNeeds: projectDetails.electricalSupply || '',
      ElectricalSupplyNeedsSubtask: JSON.stringify(
        subtaskGroups[3]?.subtasks || [],
      ),
      Stories: Number(projectDetails.stories) || 0,
      BuildingSize: Number(projectDetails.buildingSize) || 0,
      Status: status || 'DRAFT',
      OperatingArea: 'GreenField',
      Address: projectDetails.address || '',
      UserId: localStorage.getItem('userId'),
      Blueprint: projectDetails.blueprintPath || '',
    };
  }

  public navigateToJob(
    notification: any,
    dateFormat: string = 'dd/MM/yyyy',
  ): void {
    this.jobNavigation.navigateToJob(notification, dateFormat);
  }
}
