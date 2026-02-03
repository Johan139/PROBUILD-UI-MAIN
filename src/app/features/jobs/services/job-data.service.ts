import { Injectable } from '@angular/core';
import { JobsService } from '../../../services/jobs.service';
import { WeatherService } from '../../../services/weather.service';
import { Store } from '../../../store/store.service';
import { SubtasksState } from '../../../state/subtasks.state';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { formatDate } from '@angular/common';
import { PhaseMaterials } from '../../quote/quote.model';

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
            parseFloat(updatedProjectDetails.longitude),
          ).subscribe();
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
      }),
    );
  }

  fetchJobData(projectDetails: any) {
    this.getJobDetails(projectDetails.jobId, projectDetails).subscribe({
      next: () => {
        const details = this.store.getState().projectDetails;
        if (details.latitude && details.longitude) {
          this.getWeatherCondition(
            parseFloat(details.latitude),
            parseFloat(details.longitude),
          ).subscribe();
        }
      },
    });

    // Cache keys
    const subtasksStorageKey = `subtasks_${projectDetails.jobId}`;
    const materialsStorageKey = `materials_${projectDetails.jobId}`;

    if (typeof localStorage !== 'undefined') {
      // Load cached subtasks
      const cachedSubtasks = localStorage.getItem(subtasksStorageKey);
      if (cachedSubtasks) {
        try {
          const parsed = JSON.parse(cachedSubtasks);
          this.store.setState({ subtaskGroups: parsed });
        } catch (e) {
          console.error('Error parsing cached subtasks', e);
        }
      }

      // 👇 Load cached materials
      const cachedMaterials = localStorage.getItem(materialsStorageKey);
      if (cachedMaterials) {
        try {
          const parsed = JSON.parse(cachedMaterials);
          this.store.setState({ materialGroups: parsed });
        } catch (e) {
          console.error('Error parsing cached materials', e);
        }
      }
    }

    this.jobsService
      .getJobSubtasks(projectDetails.jobId)
      .pipe(
        switchMap((data: any) => {
          if (!data || data.length === 0) {
            return this.jobsService
              .GetBillOfMaterials(projectDetails.jobId)
              .pipe(
                map((results: any) => {
                  const markdown = results[0]?.fullResponse;
                  return { markdown, source: 'bom' };
                }),
              );
          }
          return of({ data, source: 'subtasks' });
        }),
        catchError((err: any) => {
          if (err.status === 404) {
            return this.jobsService
              .GetBillOfMaterials(projectDetails.jobId)
              .pipe(
                map((results: any) => {
                  const markdown = results[0]?.fullResponse;
                  return { markdown, source: 'bom' };
                }),
              );
          }
          return throwError(() => err);
        }),
      )
      .subscribe({
        next: (result: any) => {
          if (result.source === 'subtasks') {
            const grouped = this.groupSubtasksByTitle(result.data);
            this.store.setState({ subtaskGroups: grouped });
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(subtasksStorageKey, JSON.stringify(grouped));
            }
          } else if (result.source === 'bom' && result.markdown) {
            // Parse timeline for subtasks
            const parsedGroups = this.parseTimelineToTaskGroups(
              result.markdown,
            );
            this.store.setState({ subtaskGroups: parsedGroups });
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(
                subtasksStorageKey,
                JSON.stringify(parsedGroups),
              );
            }

            // 👇 CRITICAL: Extract and cache materials from quotation section
            const materialGroups = this.extractMaterialGroups(result.markdown);

            this.store.setState({ materialGroups });

            if (
              typeof localStorage !== 'undefined' &&
              materialGroups.length > 0
            ) {
              localStorage.setItem(
                materialsStorageKey,
                JSON.stringify(materialGroups),
              );
            }

            // Extract isSelected flag
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
        },
        error: (err: any) => {
          console.error('📦 Error fetching job data:', err);
          this.store.setState({ subtaskGroups: [], materialGroups: [] });
        },
      });
  }

  private groupSubtasksByTitle(
    subtasks: any[],
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

  parseDailyConstructionPlan(report: string): any[] {
    if (!report) return [];

    const dailyPlan: any[] = [];
    const startMarker = '### Phase 25: Daily Construction & Logistics Plan';
    const tableHeaderRegex =
      /\|\s*Project Day\s*\|\s*Date\s*\|\s*Phase\s*\|\s*Daily Tasks & Instructions\s*\|\s*Materials Required On-Site\s*\|\s*Equipment Required On-Site\s*\|\s*Personnel Required On-Site\s*\|\s*Key Milestones\/Inspections\s*\|/;

    let startIndex = report.indexOf(startMarker);
    if (startIndex === -1) return [];

    const lines = report.substring(startIndex).split('\n');
    let tableStarted = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('Ready for the next prompt')) {
        break;
      }

      if (!tableStarted && tableHeaderRegex.test(trimmedLine)) {
        tableStarted = true;
        continue;
      }

      if (
        !tableStarted ||
        !trimmedLine.startsWith('|') ||
        trimmedLine.includes('---')
      ) {
        continue;
      }

      const columns = trimmedLine
        .split('|')
        .map((c) => c.trim())
        .slice(1, -1);

      if (columns.length < 8) continue;

      const day = columns[0].replace(/\*\*/g, '');
      const date = columns[1];
      const phase = columns[2];
      const tasks = columns[3];
      const materials = columns[4];
      const equipment = columns[5];
      const personnel = columns[6];
      const milestones = columns[7];

      dailyPlan.push({
        day,
        date,
        phase,
        tasks,
        materials,
        equipment,
        personnel,
        milestones,
      });
    }

    return dailyPlan;
  }

  private parseTimelineToTaskGroups(
    report: string,
  ): { title: string; subtasks: any[] }[] {
    if (!report) return [];

    const taskGroupMap = new Map<string, any[]>();
    let isSelected = false;
    let isRenovation = false;
    try {
      const jsonMatch = report.match(/```json([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsedJson = JSON.parse(jsonMatch[1]);
        if (parsedJson.isSelected === 'true') {
          isSelected = true;
        }
        if (parsedJson.isRenovation === 'true') {
          isRenovation = true;
        }
      }
      if (!isRenovation) {
        // Fallback check
        isRenovation =
          /This concludes the comprehensive project analysis for the .*?\. Standing by\./.test(
            report,
          );
      }
    } catch (e) {
      console.error('Error parsing JSON for timeline:', e);
    }

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
        if (
          !tableStarted ||
          !trimmedLine.startsWith('|') ||
          trimmedLine.includes('---')
        ) {
          continue;
        }

        const columns = trimmedLine
          .split('|')
          .map((c) => c.trim())
          .slice(1, -1);
        if (columns.length < 6) continue;

        const phaseRaw = columns[0].replace(/\*\*/g, '').trim();
        if (phaseRaw) {
          currentPhase = phaseRaw;
        }

        const taskName = columns[1];
        const durationStr = columns[3];
        let startDateStr = columns[4];
        const endDateStr = columns[5];
        const costStr = columns[8];

        const cost = this.parseCost(costStr);
        // Filter out the "Total Project Duration" line by checking the task name column
        if (
          phaseRaw
            .toLowerCase()
            .replace(/\*/g, '')
            .includes('total project duration')
        ) {
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
          cost: cost,
          deleted: false,
          accepted: false,
        });
      }
    } else if (isRenovation) {
      const renovationPhaseMap: { [key: string]: string } = {
        'R-1': 'R-1: Demolition & Hazardous Material Abatement',
        'R-2': 'R-2: Structural Alterations & Repair',
        'R-3': 'R-3: MEP Rough-In',
        'R-4': 'R-4: Insulation & Drywall',
        'R-5': 'R-5: Interior Finishes',
        'R-6': 'R-6: Fixtures, Fittings & Equipment (FF&E)',
      };

      const timelineMatch = report.match(
        /### \*\*(Part A: Detailed Task Schedule|S-2: Project Timeline & Schedule)\*\*([\s\S]*?)(?=### \*\*Part B:|### \*\*S-3:|$)/,
      );
      if (!timelineMatch || !timelineMatch[2]) return [];

      const lines = timelineMatch[2].trim().split('\n');
      let tableStarted = false;
      let currentPhase = '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (
          trimmedLine.startsWith('| Task ID') ||
          trimmedLine.startsWith('| **Pre-Construction**')
        ) {
          tableStarted = true;
          continue;
        }
        if (
          !tableStarted ||
          !trimmedLine.startsWith('|') ||
          trimmedLine.includes('---')
        ) {
          continue;
        }

        const columns = trimmedLine
          .split('|')
          .map((c) => c.trim())
          .slice(1, -1);

        if (columns.filter((c) => c !== '').length <= 1) {
          continue;
        }

        // Handle different table structures
        let taskName, phaseId, duration, startDate, endDate;
        if (columns.length >= 7) {
          taskName = columns[1];
          phaseId = columns[2];
          duration = columns[3];
          startDate = columns[4];
          endDate = columns[5];
        } else if (columns.length >= 6) {
          const phaseRaw = columns[0].replace(/\*\*/g, '').trim();
          if (phaseRaw) currentPhase = phaseRaw;
          taskName = columns[1];
          phaseId = currentPhase;
          duration = columns[3];
          startDate = columns[4];
          endDate = columns[5];
        } else {
          continue;
        }

        if (taskName && taskName.toLowerCase().includes('project complete')) {
          continue;
        }

        if (phaseId.trim() === '-') {
          continue;
        }

        const rNumberMatch = phaseId.match(/(R-\d+)/);
        if (rNumberMatch && renovationPhaseMap[rNumberMatch[1]]) {
          phaseId = renovationPhaseMap[rNumberMatch[1]];
        }

        if (!taskGroupMap.has(phaseId)) {
          taskGroupMap.set(phaseId, []);
        }

        taskGroupMap.get(phaseId)?.push({
          task: this.cleanTaskName(taskName),
          days: parseInt(duration, 10) || 0,
          startDate: this.parseDate(startDate)
            ? this.formatDateToYYYYMMDD(this.parseDate(startDate)!)
            : '',
          endDate: this.parseDate(endDate)
            ? this.formatDateToYYYYMMDD(this.parseDate(endDate)!)
            : '',
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
      const headerRegex =
        /\|\s*Phase\s*\|\s*Task\s*\|\s*Duration \(Workdays\)\s*\|/;
      let currentPhase = '';

      // Only parse the "Phase 22: Timeline" section
      let inTimelineSection = false;

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.includes('### Phase 22: Timeline')) {
          inTimelineSection = true;
        }

        if (!inTimelineSection) continue;

        if (trimmedLine.startsWith('Ready for the next prompt 22')) {
          break;
        }

        if (!tableStarted && headerRegex.test(trimmedLine)) {
          tableStarted = true;
          continue;
        }
        if (
          !tableStarted ||
          !trimmedLine.startsWith('|') ||
          trimmedLine.includes('---')
        ) {
          continue;
        }

        const columns = trimmedLine
          .split('|')
          .map((c) => c.trim())
          .slice(1, -1);
        if (columns.length < 6) continue;

        let phaseRaw = columns[0];
        const taskName = columns[1];
        const duration = columns[2];
        const startDate = columns[4];
        const endDate = columns[5];
        const costStr = columns[8];

        const cost = this.parseCost(costStr);
        if (
          phaseRaw.includes('Financial Milestone') ||
          taskName.includes('Financial Milestone')
        ) {
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
          cost: cost,
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
    if (
      !dateStr ||
      dateStr.trim() === '-' ||
      dateStr.toLowerCase().includes('assumed complete')
    ) {
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
    const jobId = notification.jobId || notification.id || notification;

    this.jobsService.getSpecificJob(jobId).subscribe((job) => {
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
        biddingType: job.biddingType,
      };
      this.router.navigate(['/view-quote'], { queryParams: params });
    });
  }
  private extractMaterialGroups(markdown: string): PhaseMaterials[] {
    if (!markdown) {
      return [];
    }

    // 🔥 CRITICAL FIX: Look for the section that contains "Output 1: Quotation Data"
    // The materials JSON is AFTER this heading, not the first JSON block

    const quotationSection = markdown.match(
      /###\s*\*\*Output 1: Quotation Data[\s\S]*?```json\s*([\s\S]*?)\s*```/,
    );

    if (!quotationSection || !quotationSection[1]) {
      // Alternative: Look for JSON that contains "Categorized_Materials"
      const allJsonBlocks = markdown.matchAll(/```json\s*([\s\S]*?)\s*```/g);

      for (const match of allJsonBlocks) {
        const jsonContent = match[1];

        // Check if this JSON block contains material data
        if (jsonContent.includes('Categorized_Materials')) {
          return this.parseMaterialsFromJson(jsonContent);
        }
      }

      return [];
    }

    return this.parseMaterialsFromJson(quotationSection[1]);
  }
  private parseMaterialsFromJson(jsonString: string): PhaseMaterials[] {
    try {
      const raw = JSON.parse(jsonString);

      if (!Array.isArray(raw)) {
        return [];
      }

      // Filter items that have Categorized_Materials
      const filtered = raw.filter((x) => {
        const hasMaterials =
          x['Categorized_Materials'] &&
          Array.isArray(x['Categorized_Materials']) &&
          x['Categorized_Materials'].length > 0;

        if (!hasMaterials && x['Phase_Item']) {
        }

        return hasMaterials;
      });

      const result = filtered.map((x) => ({
        phase: x['Phase_Item'],
        csiCode: x['CSI_Code'],
        description: x['Description'],
        materials: x['Categorized_Materials'].map((m: any) => ({
          item: m.Item,
          quantity: m.Quantity,
          unit: m.Unit,
          cost: Number(m.Rate) || 0,
        })),
        labor: Number(x.Labor) || 0,
        totalAmount: Number(x.Amount) || 0,
      }));

      if (result.length > 0) {
      }

      return result;
    } catch (e) {
      console.error('🔴 Failed to parse material groups', e);
      return [];
    }
  }
  private parseCost(costStr: string | undefined): number {
    if (!costStr) return 0;

    // Handle N/A, -, empty
    if (
      costStr.toLowerCase() === 'n/a' ||
      costStr.trim() === '-' ||
      costStr.trim() === ''
    ) {
      return 0;
    }

    // Remove currency symbols and commas: "$10,450" → "10450"
    const numeric = costStr.replace(/[^0-9.]/g, '');
    const value = parseFloat(numeric);

    return isNaN(value) ? 0 : value;
  }
}
