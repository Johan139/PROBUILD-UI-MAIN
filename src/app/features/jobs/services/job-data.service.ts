import { Injectable } from '@angular/core';
import { JobsService } from '../../../services/jobs.service';
import { WeatherService } from '../../../services/weather.service';
import { Store } from '../../../store/store.service';
import { SubtasksState } from '../../../state/subtasks.state';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  catchError,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { Router } from '@angular/router';
import { formatDate } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class JobDataService {
  constructor(
    private jobsService: JobsService,
    private weatherService: WeatherService,
    private store: Store<SubtasksState>,
    private snackBar: MatSnackBar,
    private router: Router,
  ) {}

  getJobDetails(jobId: string, projectDetails: any) {
    return this.jobsService.getSpecificJob(jobId).pipe(
      tap((jobDetails) => {
        const updatedProjectDetails = { ...projectDetails, ...jobDetails };
        if (jobDetails.address) {
          updatedProjectDetails.address = jobDetails.address;
          updatedProjectDetails.latitude = jobDetails.latitude;
          updatedProjectDetails.longitude = jobDetails.longitude;
        }
        this.store.setState({ projectDetails: updatedProjectDetails });
        if (updatedProjectDetails.latitude && updatedProjectDetails.longitude) {
          this.getWeatherCondition(
            parseFloat(updatedProjectDetails.latitude),
            parseFloat(updatedProjectDetails.longitude)
          ).subscribe();
        }
      }),
      catchError((err) => {
        console.error('Failed to load job details', err);
        this.snackBar.open('Failed to refresh job details.', 'Close', {
          duration: 3000,
        });
        return throwError(() => err);
      })
    );
  }

  getWeatherCondition(lat: number, lon: number) {
    return this.weatherService.getWeatherForecast(lat, lon).pipe(
      tap((data) => {
        this.store.setState({
          forecast: data,
          weatherDescription: data[0]?.condition || 'Unavailable',
          weatherError: null,
        });
      }),
      catchError((err) => {
        this.store.setState({
          forecast: [],
          weatherDescription: 'Unavailable',
          weatherError: 'Failed to load weather forecast',
        });
        return throwError(() => err);
      })
    );
  }

  fetchJobData(projectDetails: any) {
    this.getJobDetails(projectDetails.jobId, projectDetails).subscribe({
      next: () => {
        const details = this.store.getState().projectDetails;
        if (details.latitude && details.longitude) {
          this.getWeatherCondition(
            parseFloat(details.latitude),
            parseFloat(details.longitude)
          ).subscribe();
        }
      },
    });

    this.jobsService.getJobSubtasks(projectDetails.jobId).pipe(
      switchMap((data: any) => {
        if (!data || data.length === 0) {
          return this.jobsService.GetBillOfMaterials(projectDetails.jobId).pipe(
            map((results: any) => {
              const markdown = results[0]?.fullResponse;
              return { markdown, source: 'bom' };
            })
          );
        }
        return of({ data, source: 'subtasks' });
      }),
      catchError((err: any) => {
        if (err.status === 404) {
          return this.jobsService.GetBillOfMaterials(projectDetails.jobId).pipe(
            map((results: any) => {
              const markdown = results[0]?.fullResponse;
              return { markdown, source: 'bom' };
            })
          );
        }
        return throwError(() => err);
      })
    ).subscribe({
      next: (result: any) => {
        if (result.source === 'subtasks') {
          const grouped = this.groupSubtasksByTitle(result.data);
          this.store.setState({ subtaskGroups: grouped });
        } else if (result.source === 'bom' && result.markdown) {
          const parsedGroups = this.parseTimelineToTaskGroups(result.markdown);
          this.store.setState({ subtaskGroups: parsedGroups });

          // Also extract isSelected flag and update projectDetails
          try {
            const jsonMatch = result.markdown.match(/```json([\s\S]*?)```/);
            if (jsonMatch && jsonMatch[1]) {
              const parsedJson = JSON.parse(jsonMatch[1]);
              if (parsedJson.isSelected === 'true') {
                const currentDetails = this.store.getState().projectDetails;
                this.store.setState({
                  projectDetails: { ...currentDetails, isSelected: true }
                });
              }
            }
          } catch (e) {
            console.error('Error parsing isSelected flag:', e);
          }
        }
      },
      error: (err: any) => {
        console.error(err);
        this.store.setState({ subtaskGroups: [] });
      }
    });
  }

  private groupSubtasksByTitle(
    subtasks: any[]
  ): { title: string; subtasks: any[]; progress: number }[] {
    const groupedMap = new Map<string, any[]>();
    for (const st of subtasks) {
      const group = groupedMap.get(st.groupTitle) || [];
      const formatDate = (date: string) => {
        if (!date) return '';
        return new Date(date).toISOString().split('T')[0];
      };
      group.push({
        id: st.id,
        task: this.cleanTaskName(st.task ?? st.taskName),
        days: st.days,
        startDate: formatDate(st.startDate),
        endDate: formatDate(st.endDate),
        status: st.status ?? 'Pending',
        cost: st.cost ?? 0,
        deleted: st.deleted ?? false,
      });
      groupedMap.set(st.groupTitle, group);
    }
    return Array.from(groupedMap.entries()).map(([title, subtasks]) => {
      const completedCount = subtasks.filter(
        (s) => s.status && s.status.toLowerCase() === 'completed'
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

  private parseTimelineToTaskGroups(
    report: string
  ): { title: string; subtasks: any[] }[] {
    if (!report) return [];

    const taskGroupMap = new Map<string, any[]>();
    let isSelected = false;
    try {
      const jsonMatch = report.match(/```json([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsedJson = JSON.parse(jsonMatch[1]);
        if (parsedJson.isSelected === 'true') {
          isSelected = true;
        }
      }
    } catch (e) {
      console.error('Error parsing JSON for timeline:', e);
    }

    const isRenovation = report.includes(
      'This concludes the comprehensive project analysis for the renovation. Standing by.'
    );

    if (isSelected) {
      const lines = report.split('\n');
      let tableStarted = false;
      let currentPhase = '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('| Phase | Task |')) {
          tableStarted = true;
          continue;
        }
        if (!tableStarted || !trimmedLine.startsWith('|') || trimmedLine.includes('---')) {
          continue;
        }

        const columns = trimmedLine.split('|').map(c => c.trim()).slice(1, -1);
        if (columns.length < 6) continue;

        const phaseRaw = columns[0].replace(/\*\*/g, '').trim();
        if (phaseRaw) {
          currentPhase = phaseRaw;
        }

        const taskName = columns[1];
        const durationStr = columns[3];
        let startDateStr = columns[4];
        const endDateStr = columns[5];

        // Filter out the "Total Project Duration" line by checking the task name column
        if (phaseRaw.toLowerCase().replace(/\*/g, '').includes('total project duration')) {
          continue;
        }

        const duration = parseInt(durationStr, 10) || 0;
        let endDate = this.parseDate(endDateStr);
        let startDate = this.parseDate(startDateStr);

        if (!startDate && endDate && duration > 0) {
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - duration);
        } else if (!startDate && endDate) {
          startDate = endDate;
        }

        if (!taskGroupMap.has(currentPhase)) {
          taskGroupMap.set(currentPhase, []);
        }

        taskGroupMap.get(currentPhase)?.push({
          task: this.cleanTaskName(taskName),
          days: duration,
          startDate: startDate ? this.formatDateToYYYYMMDD(startDate) : '',
          endDate: endDate ? this.formatDateToYYYYMMDD(endDate) : '',
          status: 'Pending',
          cost: 0,
          deleted: false,
          accepted: false,
        });
      }
    } else if (isRenovation) {
      // First, create a map of Phase IDs (e.g., "R-1") to full names
      const phaseMap = new Map<string, string>();
      const phaseRegex = /### \*\*(Phase (R-\d+): (.*?)) Bill of Quantities\*\*/g;
      let match;
      while ((match = phaseRegex.exec(report)) !== null) {
        const phaseId = match[2];
        const fullName = match[3].trim();
        phaseMap.set(phaseId, fullName);
      }

      const timelineMatch = report.match(/### \*\*S-2: Project Timeline & Schedule\*\*([\s\S]*?)(?=### \*\*S-3:|$)/);
      if (!timelineMatch || !timelineMatch[1]) return [];

      const lines = timelineMatch[1].trim().split('\n');
      let tableStarted = false;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('| Task ID')) {
          tableStarted = true;
          continue;
        }
        if (!tableStarted || !trimmedLine.startsWith('|') || trimmedLine.includes('---')) {
          continue;
        }

        const columns = trimmedLine.split('|').map(c => c.trim()).slice(1, -1);
        if (columns.length < 7) continue;

        const taskName = columns[1];
        const phaseId = columns[2]; // This is "R-1", "R-2", etc.
        const duration = columns[3];
        const startDate = columns[4];
        const endDate = columns[5];

        // Use the map to get the full, descriptive name
        const descriptivePhaseName = phaseMap.get(phaseId) || phaseId;

        if (!taskGroupMap.has(descriptivePhaseName)) {
          taskGroupMap.set(descriptivePhaseName, []);
        }

        const formatDateString = (dateStr: string) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        };

        taskGroupMap.get(descriptivePhaseName)?.push({
          task: this.cleanTaskName(taskName),
          days: parseInt(duration, 10) || 0,
          startDate: formatDateString(startDate),
          endDate: formatDateString(endDate),
          status: 'Pending',
          cost: 0,
          deleted: false,
          accepted: false,
        });
      }
    } else {
      // Existing logic for Full Analysis
      const lines = report.split('\n');
      let tableStarted = false;
      const headerRegex = /\|\s*Phase\s*\|\s*Task\s*\|\s*Duration \(Workdays\)\s*\|/;
      let currentPhase = '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('Ready for the next prompt 20')) break;
        if (!tableStarted && headerRegex.test(trimmedLine)) {
          tableStarted = true;
          continue;
        }
        if (!tableStarted || !trimmedLine.startsWith('|') || trimmedLine.includes('---')) {
          continue;
        }

        const columns = trimmedLine.split('|').map((c) => c.trim()).slice(1, -1);
        if (columns.length < 6) continue;

        let phaseRaw = columns[0];
        const taskName = columns[1];
        const duration = columns[2];
        const startDate = columns[4];
        const endDate = columns[5];

        if (phaseRaw.includes('Financial Milestone') || taskName.includes('Financial Milestone')) {
          continue;
        }

        const phaseName = phaseRaw.replace(/\*\*|\\/g, '').trim();
        if (phaseName) {
          currentPhase = phaseName;
        }
        if (!taskGroupMap.has(currentPhase)) {
          taskGroupMap.set(currentPhase, []);
        }
        if (!taskName) {
          continue;
        }
        const formatDateString = (dateStr: string) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        };

        taskGroupMap.get(currentPhase)?.push({
          task: this.cleanTaskName(taskName),
          days: parseInt(duration, 10) || 0,
          startDate: formatDateString(startDate),
          endDate: formatDateString(endDate),
          status: 'Pending',
          cost: 0,
          deleted: false,
          accepted: false,
        });
      }
    }

    return Array.from(taskGroupMap.entries()).map(([title, subtasks]) => ({
      title: this.cleanTaskName(title),
      subtasks,
    }));
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '-' || dateStr.toLowerCase().includes('assumed complete')) {
      return null;
    }
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  private formatDateToYYYYMMDD(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private cleanTaskName(name: string): string {
    if (typeof name === 'string') {
      return name.replace(/^\*\*|\*\*$/g, '').trim();
    }
    return name;
  }

  prepareProjectData(status: string, projectDetails: any, subtaskGroups: any[]): any {
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
          : new Date()
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
        subtaskGroups[3]?.subtasks || []
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

 public navigateToJob(notification: any, dateFormat: string = 'dd/MM/yyyy'): void {
  const jobId = notification.jobId || notification.id || notification;

  this.jobsService.getSpecificJob(jobId).subscribe(job => {
    const parsedDate = new Date(job.desiredStartDate);
    const formattedDate = formatDate(parsedDate, dateFormat, 'en-GB');
    const params = {
      jobId: job.jobId,
      operatingArea: job.operatingArea,
      address: job.address,
      projectName: job.projectName,
      jobType: job.jobType,
      buildingSize: job.buildingSize,
      wallStructure: job.wallStructure,
      wallInsulation: job.wallInsulation,
      roofStructure: job.roofStructure,
      roofInsulation: job.roofInsulation,
      electricalSupply: job.electricalSupply,
      finishes: job.finishes,
      foundation: job.foundation,
      date: formattedDate,
      documents: job.documents,
      latitude: job.latitude,
      longitude: job.longitude,
    };
    this.router.navigate(['/view-quote'], { queryParams: params });
  });
}
}
