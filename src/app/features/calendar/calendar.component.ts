import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { CalendarService } from './calendar.service';
import { JobsService } from '../../services/jobs.service';
import { CalendarEvent } from './calendar.model';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FullCalendarModule } from '@fullcalendar/angular';
import { AddEventDialogComponent } from './add-event-dialog.component';
import { JobDataService } from '../jobs/services/job-data.service';
import { Job } from '../../models/job';
import { CommonModule } from '@angular/common';
import { JobCardComponent } from '../../components/job-card/job-card.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-calendar',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatCardModule,
        MatDividerModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        FullCalendarModule,
        MatButtonToggleModule,
        MatSelectModule,
        MatTooltipModule,
        JobCardComponent,
        MatIconModule
    ],
    templateUrl: './calendar.component.html',
    styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  calendarOptions: CalendarOptions;
  isLoading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  events: CalendarEvent[] = [];
  viewMode: 'projects' | 'tasks' = 'projects';
  allEvents: EventInput[] = [];
  statusFilter: "all" | "BIDDING" | "LIVE" | "DRAFT" = "all";

  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  selectedJobIds: number[] = [];
  jobColors: { [key: number]: string } = {};
  searchTerm: string = '';
  hideEmptyProjects: boolean = true;

  constructor(
    private calendarService: CalendarService,
    private jobsService: JobsService,
    private jobDataService: JobDataService,
    private dialog: MatDialog
  ) {
    this.calendarOptions = {
      plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin, listPlugin],
      initialView: 'dayGridMonth',
      nowIndicator: true,
      weekNumberCalculation: 'ISO',
      navLinks: true,
      selectable: true,
      selectMirror: true,
      headerToolbar: {
        left: 'prevYear,prev,next,nextYear today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,dayGridYear'
      },
      buttonText: {
        today: 'Today',
        month: 'Month',
        week: 'Week',
        day: 'Day',
        year: 'Year'
      },
      events: [],
      eventClick: this.handleEventClick.bind(this),
      editable: true
    };
  }

  ngOnInit(): void {
    this.loadEvents();
    this.loadJobs();
  }

  loadJobs(): void {
    this.isLoading = true;
    const userId = localStorage.getItem('userId');
    if (!userId) {
      this.errorMessage = 'User ID not found.';
      this.isLoading = false;
      return;
    }

    this.jobsService.getAllJobsByUserId(userId).subscribe({
      next: (response: any[]) => {
        const normalizedJobs = response.map(j => ({
            ...j,
            jobId: j.jobId || j.id,
            jobType: j.jobType || j.JobType || 'Unknown',
            potentialStartDate: j.potentialStartDate || j.PotentialStartDate,
            potentialEndDate: j.potentialEndDate || j.PotentialEndDate,
            durationInDays: j.durationInDays || j.DurationInDays,
            address: j.address || j.Address || j.formattedAddress || j.FormattedAddress,
            city: j.city || j.City,
            state: j.state || j.State
        })) as Job[];

        // Filter out failed jobs
        this.jobs = normalizedJobs.filter(job => job.status !== 'FAILED');
        this.filteredJobs = this.jobs;

        // Assign a unique color to each job
        this.jobs.forEach((job) => {
            if (job.jobId && !this.jobColors[job.jobId]) {
                this.jobColors[job.jobId] = this.getRandomColor();
            }
        });

        const allEvents: EventInput[] = [];
        const jobPromises = this.jobs.map((job) =>
          new Promise<void>((resolve) => {
            const processSubtasks = (subtaskGroups: any[]) => {
              const subtaskEvents: EventInput[] = [];
              let minDate: Date | null = null;
              let maxDate: Date | null = null;

              subtaskGroups.forEach(group => {
                group.subtasks.forEach((subtask: any) => {
                  if (subtask.startDate && subtask.endDate) {
                    const startDate = new Date(subtask.startDate);
                    const endDate = new Date(subtask.endDate);

                    if (!minDate || startDate < minDate) {
                      minDate = startDate;
                    }
                    if (!maxDate || endDate > maxDate) {
                      maxDate = endDate;
                    }

                    subtaskEvents.push({
                      title: `[${job.projectName}] Subtask: ${subtask.task}`,
                      start: subtask.startDate,
                      end: subtask.endDate,
                      backgroundColor: this.getRandomColor(),
                      borderColor: this.getRandomColor(),
                      textColor: '#111827',
                      extendedProps: {
                        jobId: job.jobId,
                        jobStatus: job.status
                      }
                    });
                  }
                });
              });

              if (minDate && maxDate) {
                const projectColor = this.jobColors[job.jobId];
                allEvents.push({
                  title: `Project: ${job.projectName}`,
                  start: (minDate as Date).toISOString().split('T')[0],
                  end: (maxDate as Date).toISOString().split('T')[0],
                  backgroundColor: projectColor,
                  borderColor: projectColor,
                  textColor: '#111827',
                  allDay: true,
                  extendedProps: {
                    jobId: job.jobId,
                    jobStatus: job.status
                  }
                });

                job.potentialStartDate = minDate as Date;
                job.potentialEndDate = maxDate as Date;
                const diffTime = Math.abs((maxDate as Date).getTime() - (minDate as Date).getTime());
                job.durationInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
              }

              allEvents.push(...subtaskEvents);
              resolve();
            };

            this.jobsService.getJobSubtasks(job.jobId).subscribe({
              next: (subtasks) => {
                if (subtasks && subtasks.length > 0) {
                  const grouped = this.jobDataService['groupSubtasksByTitle'](subtasks);
                  processSubtasks(grouped);
                } else {
                  this.fetchSubtasksFromBom(job.jobId).then(processSubtasks);
                }
              },
              error: () => {
                this.fetchSubtasksFromBom(job.jobId).then(processSubtasks);
              }
            });
          })
        );

        Promise.all(jobPromises).then(() => {
          this.allEvents = [...(this.calendarOptions.events as EventInput[]), ...allEvents];
          this.updateCalendarView();
          this.isLoading = false;
          this.filterJobs();
        });
      },
      error: (error) => {
        console.error('Error fetching jobs:', error);
        this.errorMessage = 'Failed to load jobs. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private fetchSubtasksFromBom(jobId: number): Promise<any[]> {
    return new Promise((resolve) => {
      this.jobsService.GetBillOfMaterials(jobId).subscribe({
        next: (results) => {
          if (results && results[0]?.fullResponse) {
            const markdown = results[0].fullResponse;
            const parsedGroups = this.jobDataService['parseTimelineToTaskGroups'](markdown);
            resolve(parsedGroups);
          } else {
            resolve([]);
          }
        },
        error: (err) => {
          console.error(`Error fetching BOM for job ${jobId}:`, err);
          resolve([]);
        }
      });
    });
  }

  getRandomColor(): string {
    const yellowPalette = [
      '#FCD109',
      '#FFE473',
      '#FFD700',
      '#FFC107',
      '#FFEB3B',
      '#FBC02D',
      '#F57F17',
      '#FFF176',
      '#FFEE58',
      '#FDD835',
      '#F9A825',
      '#FFB300',
      '#F0B90B',
      '#E1AD01',
      '#D4AF37',
      '#C5A000'
    ];
    return yellowPalette[Math.floor(Math.random() * yellowPalette.length)];
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.calendarService.getEvents().subscribe({
      next: (events: CalendarEvent[]) => {
        this.events = events;
        this.calendarOptions.events = events.map(event => ({
          id: event.id,
          title: event.title,
          start: event.startDate,
          end: event.endDate,
          description: event.description
        })) as EventInput[];
        this.successMessage = 'Events loaded successfully';
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching events:', error);
        this.errorMessage = 'Failed to load events. Please try again.';
        this.isLoading = false;
      }
    });
  }

  handleEventClick(info: any): void {
    const eventType = info.event.title.startsWith('Project:') ? 'project' : 'task';
    if (eventType === 'project') {
      const projectName = info.event.title.replace('Project: ', '');
      this.viewMode = 'tasks';
      this.updateCalendarView(projectName);
    } else {
      alert(`Event: ${info.event.title}\nDescription: ${info.event.extendedProps.description}`);
    }
  }

  toggleJobSelection(jobId: number): void {
    if (this.selectedJobIds.includes(jobId)) {
      this.selectedJobIds = this.selectedJobIds.filter(id => id !== jobId);
    } else {
      this.selectedJobIds.push(jobId);
    }
    this.updateCalendarView();
  }

  isJobSelected(jobId: number): boolean {
    return this.selectedJobIds.includes(jobId);
  }

  toggleEmptyProjects(): void {
    this.hideEmptyProjects = !this.hideEmptyProjects;
    this.filterJobs();
  }

  jobHasEvents(jobId: number): boolean {
    if (!this.allEvents) return false;
    return this.allEvents.some(event => event.extendedProps?.['jobId'] === jobId);
  }

  filterJobs(): void {
    let result = this.jobs;

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(job =>
        job.projectName.toLowerCase().includes(term) ||
        (job.jobId && job.jobId.toString().includes(term))
      );
    }

    if (this.hideEmptyProjects) {
        result = result.filter(job => this.jobHasEvents(job.jobId));
    }

    this.filteredJobs = result;
  }

  updateCalendarView(projectName?: string): void {
    let filteredEvents = this.allEvents;

    if (this.statusFilter !== 'all') {
      filteredEvents = filteredEvents.filter(event => event.extendedProps?.['jobStatus'] === this.statusFilter);
    }

    if (this.selectedJobIds.length > 0) {
        filteredEvents = filteredEvents.filter(event =>
            event.extendedProps?.['jobId'] && this.selectedJobIds.includes(event.extendedProps?.['jobId'])
        );
    }

    if (this.viewMode === 'projects') {
      this.calendarOptions.events = filteredEvents.filter(event => event.title?.startsWith('Project:'));
    } else {
      if (projectName) {
        this.calendarOptions.events = filteredEvents.filter(event => {
          return event.title?.startsWith(`[${projectName}] Subtask:`);
        });
      } else {
        this.calendarOptions.events = filteredEvents.filter(event => event.title?.includes('Subtask:'));
      }
    }
  }

  openAddEventDialog(): void {
    const dialogRef = this.dialog.open(AddEventDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.calendarService.addEvent(result).subscribe({
          next: (newEvent: CalendarEvent) => {
            this.events.push(newEvent);
            //this.calendarOptions.events = [...this.calendarOptions.events, {
            //  id: newEvent.id,
            //  title: newEvent.title,
            //  start: newEvent.startDate,
            //  end: newEvent.endDate,
            //  description: newEvent.description
            //}] as EventInput[];
            this.successMessage = 'Event added successfully';
          },
          error: (error) => {
            console.error('Error adding event:', error);
            this.errorMessage = 'Failed to add event. Please try again.';
          }
        });
      }
    });
  }
}
