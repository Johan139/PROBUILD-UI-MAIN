import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { format, addDays, differenceInCalendarDays } from 'date-fns';

export interface TimelineTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress?: number;
  dependencies?: string | null;
  resource?: string;
  color?: string;
  isCritical?: boolean;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline-container">
      <!-- Timeline Controls -->
      <div class="timeline-controls">
        <div class="timeline-navigation">
          <button
            class="nav-btn"
            (click)="navigateTimeline(-14)">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <button
            class="nav-btn"
            (click)="navigateTimeline(14)">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>

          <div class="date-range">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span>
              {{formatDate(viewStartDate, 'MMM d, yyyy')}} - {{formatDate(dates[dates.length - 1], 'MMM d, yyyy')}}
            </span>
          </div>
        </div>

        <!-- Legend -->
        <div class="timeline-legend">
          <div class="legend-item">
            <div class="legend-color" style="background-color: #61a0af;"></div>
            <span>Regular Task</span>
          </div>
          <div class="legend-item">
            <div class="legend-color critical" style="background-color: #61a0af; border: 2px solid #ef4444;"></div>
            <span>Critical Path</span>
          </div>
        </div>
      </div>

      <!-- Timeline Header - Dates -->
      <div class="timeline-header">
        <div class="task-labels-header">Tasks</div>
        <div class="timeline-dates">
          <div
            *ngFor="let date of dates; let i = index"
            class="date-cell"
            [class.weekend]="isWeekend(date)">
            {{i % 7 === 0 ? formatDate(date, 'MMM d') : formatDate(date, 'd')}}
          </div>
        </div>
      </div>

      <!-- Timeline Grid -->
      <div
        #timelineRef
        class="timeline-grid"
        [style.height.px]="timelineHeight"
        (mousemove)="handleDragOver($event)"
        (mouseup)="handleDragEnd($event)"
        (mouseleave)="handleDragEnd($event)">

        <!-- Task rows -->
        <div
          *ngFor="let task of tasks; let taskIndex = index"
          class="task-row"
          [style.top.px]="taskIndex * 50">

          <!-- Task Label -->
          <div class="task-label">
            {{task.name}}
          </div>

          <!-- Grid Background -->
          <div class="grid-background">
            <div
              *ngFor="let date of dates"
              class="grid-cell"
              [class.weekend]="isWeekend(date)">
            </div>
          </div>

          <!-- Task Bar -->
          <div
            class="task-bar"
            [class.critical]="task.isCritical"
            [class.dragging]="draggingTask === task.id"
            [style]="getTaskStyle(task)"
            [title]="getTaskTooltip(task)"
            (click)="onTaskClick.emit(task)"
            (mousedown)="handleDragStart($event, task.id)">

            <div class="task-content">
              <span class="task-name">{{task.name}}</span>
              <span class="task-duration">
                {{formatDate(task.start, 'MMM d')}} - {{formatDate(task.end, 'MMM d')}}
              </span>
            </div>

            <!-- Progress Bar -->
            <div class="progress-bar" *ngIf="task.progress !== undefined">
              <div
                class="progress-fill"
                [style.width.%]="task.progress">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .timeline-container {
      background: linear-gradient(135deg, #fff 0%, #f9f9f9 100%);
      border: 1px solid #d9d9d9;
      border-radius: 8px;
      overflow: hidden;
      font-family: Arial, sans-serif;
    }

    .timeline-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background-color: #fff;
      border-bottom: 1px solid #d9d9d9;
    }

    .timeline-navigation {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid #d9d9d9;
      background: #fff;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .nav-btn:hover {
      background-color: #f5f5f5;
      border-color: #61a0af;
    }

    .date-range {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: 1rem;
      font-weight: 500;
      color: #333;
    }

    .timeline-legend {
      display: flex;
      gap: 1rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-color.critical {
      border-width: 1px !important;
    }

    .timeline-header {
      display: flex;
      background-color: #fbd008;
      border-bottom: 2px solid #d9d9d9;
    }

    .task-labels-header {
      width: 200px;
      padding: 0.75rem 1rem;
      font-weight: 600;
      color: #000;
      border-right: 1px solid #d9d9d9;
      display: flex;
      align-items: center;
    }

    .timeline-dates {
      display: flex;
      flex: 1;
    }

    .date-cell {
      flex: 1;
      padding: 0.5rem 0.25rem;
      text-align: center;
      font-size: 0.75rem;
      font-weight: 500;
      color: #000;
      border-right: 1px solid rgba(217, 217, 217, 0.5);
    }

    .date-cell.weekend {
      background-color: rgba(0, 0, 0, 0.05);
    }

    .timeline-grid {
      position: relative;
      overflow-y: auto;
      background-color: #fff;
    }

    .task-row {
      position: absolute;
      width: 100%;
      height: 48px;
      display: flex;
      border-bottom: 1px solid #f0f0f0;
    }

    .task-label {
      width: 200px;
      padding: 0.75rem 1rem;
      background-color: #fff;
      border-right: 1px solid #d9d9d9;
      display: flex;
      align-items: center;
      font-size: 0.875rem;
      font-weight: 500;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      position: sticky;
      left: 0;
      z-index: 2;
    }

    .grid-background {
      display: flex;
      flex: 1;
      position: absolute;
      left: 200px;
      right: 0;
      height: 100%;
    }

    .grid-cell {
      flex: 1;
      border-right: 1px solid rgba(217, 217, 217, 0.3);
      height: 100%;
    }

    .grid-cell.weekend {
      background-color: rgba(0, 0, 0, 0.02);
    }

    .task-bar {
      position: absolute;
      height: 32px;
      top: 8px;
      background-color: #61a0af;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid #4a8a98;
      overflow: hidden;
      z-index: 3;
      left: 200px;
    }

    .task-bar:hover {
      background-color: #fbd008;
      border-color: #e6bd00;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .task-bar.critical {
      border: 2px solid #ef4444;
      border-radius: 4px;
    }

    .task-bar.dragging {
      opacity: 0.7;
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
      z-index: 10;
    }

    .task-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 0.5rem;
      height: 100%;
      color: white;
      font-size: 0.75rem;
    }

    .task-name {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .task-duration {
      font-size: 0.65rem;
      opacity: 0.9;
      line-height: 1;
    }

    .progress-bar {
      position: absolute;
      bottom: 2px;
      left: 2px;
      right: 2px;
      height: 3px;
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 1px;
    }

    .progress-fill {
      height: 100%;
      background-color: rgba(255, 255, 255, 0.9);
      border-radius: 1px;
      transition: width 0.3s ease;
    }
  `]
})
export class TimelineComponent implements OnInit, OnDestroy {
  @Input() tasks: TimelineTask[] = [];
  @Output() onTaskClick = new EventEmitter<TimelineTask>();
  @Output() onTaskMove = new EventEmitter<{taskId: string, newStartDate: Date, newEndDate: Date}>();

  @ViewChild('timelineRef', { static: false }) timelineRef!: ElementRef<HTMLDivElement>;

  viewStartDate: Date = new Date();
  draggingTask: string | null = null;
  dragOffset: number = 0;
  daysToShow: number = 45;
  dates: Date[] = [];
  timelineHeight: number = 400;

  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseUpListener?: (e: MouseEvent) => void;

  ngOnInit() {
    this.initializeViewStartDate();
    this.generateDates();
    this.calculateTimelineHeight();
    this.setupGlobalListeners();
  }

  ngOnDestroy() {
    this.cleanupGlobalListeners();
  }

  private initializeViewStartDate() {
    if (this.tasks.length === 0) {
      this.viewStartDate = new Date();
      return;
    }

    const earliestDate = new Date(
      Math.min(...this.tasks.map(t => t.start.getTime()))
    );

    // Set view start date to 7 days before the earliest task
    const newStartDate = new Date(earliestDate);
    newStartDate.setDate(newStartDate.getDate() - 7);
    this.viewStartDate = newStartDate;
  }

  private calculateTimelineHeight() {
    this.timelineHeight = Math.max(300, this.tasks.length * 50 + 20);
  }

  private setupGlobalListeners() {
    this.mouseMoveListener = (e: MouseEvent) => this.handleDragOver(e);
    this.mouseUpListener = (e: MouseEvent) => this.handleDragEnd(e);

    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseup', this.mouseUpListener);
  }

  private cleanupGlobalListeners() {
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
    }
    if (this.mouseUpListener) {
      document.removeEventListener('mouseup', this.mouseUpListener);
    }
  }

  private generateDates() {
    this.dates = Array.from({ length: this.daysToShow }, (_, i) => {
      const date = new Date(this.viewStartDate);
      date.setDate(date.getDate() + i);
      return date;
    });
  }

  navigateTimeline(days: number) {
    const newDate = new Date(this.viewStartDate);
    newDate.setDate(newDate.getDate() + days);
    this.viewStartDate = newDate;
    this.generateDates();
  }

  handleDragStart(e: MouseEvent, taskId: string) {
    e.preventDefault();
    this.draggingTask = taskId;

    if (this.timelineRef?.nativeElement) {
      const rect = this.timelineRef.nativeElement.getBoundingClientRect();
      this.dragOffset = e.clientX - rect.left - 200; // Account for task labels width
    }
  }

  handleDragOver(e: MouseEvent) {
    e.preventDefault();
    if (!this.draggingTask || !this.timelineRef?.nativeElement) return;

    // Visual feedback could be added here
  }

  handleDragEnd(e: MouseEvent) {
    if (!this.draggingTask || !this.timelineRef?.nativeElement) {
      this.draggingTask = null;
      return;
    }

    const rect = this.timelineRef.nativeElement.getBoundingClientRect();
    const timelineWidth = rect.width - 200; // Account for task labels
    const dayWidth = timelineWidth / this.daysToShow;
    const dayOffset = Math.floor((e.clientX - rect.left - 200) / dayWidth);

    const task = this.tasks.find(t => t.id === this.draggingTask);
    if (task && dayOffset >= 0) {
      const taskDuration = differenceInCalendarDays(task.end, task.start);

      const newStartDate = new Date(this.viewStartDate);
      newStartDate.setDate(newStartDate.getDate() + dayOffset);

      const newEndDate = addDays(newStartDate, taskDuration);

      this.onTaskMove.emit({
        taskId: this.draggingTask,
        newStartDate,
        newEndDate
      });
    }

    this.draggingTask = null;
  }

  getTaskStyle(task: TimelineTask): any {
    const startDiff = differenceInCalendarDays(task.start, this.viewStartDate);
    const duration = differenceInCalendarDays(task.end, task.start) + 1;

    const timelineWidth = 100; // Use percentage
    const left = `${(startDiff / this.daysToShow) * timelineWidth}%`;
    const width = `${(duration / this.daysToShow) * timelineWidth}%`;

    return {
      left,
      width,
      'background-color': task.color || '#61a0af',
    };
  }

  getTaskTooltip(task: TimelineTask): string {
    return `${task.name}\n${this.formatDate(task.start, 'MMM d')} - ${this.formatDate(task.end, 'MMM d')}\nProgress: ${task.progress || 0}%`;
  }

  isWeekend(date: Date): boolean {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  formatDate(date: Date, formatStr: string): string {
    return format(date, formatStr);
  }
}
