import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, OnDestroy, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
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
  status?: 'pending' | 'in_progress' | 'completed' | 'delayed';
  cost?: number;
  deleted?: boolean;
  accepted?: boolean;
  task?: string; // For subtask compatibility
  days?: number;
  startDate?: string;
  endDate?: string;
}

export interface TimelineGroup {
  title: string;
  subtasks: TimelineTask[];
  startDate?: Date;
  endDate?: Date;
  progress?: number;
  scheduleStatus?: 'on-track' | 'behind' | 'ahead';
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
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
              {{formatDate(viewStartDate, 'MMM d, yyyy')}} - {{formatDate(getEndDate(), 'MMM d, yyyy')}}
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

      <!-- Timeline Header - Weekly Dates -->
      <div class="timeline-header">
        <div
          *ngFor="let week of weeklyDates; let i = index"
          class="week-cell"
          [class.current-week]="isCurrentWeek(week.start)">
          <div class="week-label">{{formatDate(week.start, 'MMM d')}}</div>
          <div class="week-days">
            <div
              *ngFor="let day of week.days"
              class="day-cell"
              [class.weekend]="isWeekend(day)"
              [class.today]="isToday(day)">
              {{formatDate(day, 'd')}}
            </div>
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

        <!-- Grid Background -->
        <div class="grid-background">
          <div
            *ngFor="let week of weeklyDates"
            class="week-grid"
            [class.current-week-bg]="isCurrentWeek(week.start)">
            <div
              *ngFor="let day of week.days"
              class="day-grid"
              [class.weekend-bg]="isWeekend(day)"
              [class.today-bg]="isToday(day)">
            </div>
          </div>
        </div>

        <!-- Task Groups (Main Tasks) -->
        <div
          *ngFor="let group of taskGroups; let groupIndex = index"
          class="task-group-bar"
          [class.critical]="isGroupCritical(group)"
          [class.dragging]="draggingGroup === group.title"
          [style]="getGroupStyle(group, groupIndex)"
          [attr.data-group]="group.title"
          [title]="getGroupTooltip(group)"
          (click)="openGroupModal(group)"
          (mousedown)="handleDragStart($event, group.title)">

          <div class="task-content">
            <div class="task-name">{{group.title}}</div>
            <div class="task-duration">
              {{formatDate(group.startDate!, 'MMM d')}} - {{formatDate(group.endDate!, 'MMM d')}}
            </div>
            <div class="task-count">{{group.subtasks.length}} tasks</div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="group.progress || 0">
            </div>
          </div>
        </div>

        <!-- Today Line -->
        <div class="today-line" [style.left]="getTodayPosition()"></div>
      </div>
    </div>

    <!-- Task Group Detail Modal -->
    <ng-template #groupDetailModal let-data>
      <div class="group-modal">
        <div class="modal-header">
          <h2>{{selectedGroup?.title}}</h2>
          <button class="close-btn" (click)="closeGroupModal()">×</button>
        </div>

        <div class="modal-content">
          <div class="group-info">
            <div class="info-item">
              <strong>Duration:</strong>
              {{formatDate(selectedGroup?.startDate!, 'MMM d, yyyy')}} -
              {{formatDate(selectedGroup?.endDate!, 'MMM d, yyyy')}}
            </div>
            <div class="info-item">
              <strong>Progress:</strong> {{selectedGroup?.progress || 0}}%
            </div>
            <div class="info-item">
              <strong>Status:</strong>
              <span [class]="'status-' + (selectedGroup?.scheduleStatus || 'on-track')">
                {{selectedGroup?.scheduleStatus || 'on-track'}}
              </span>
            </div>
          </div>

          <h3>Subtasks ({{selectedGroup?.subtasks?.length || 0}})</h3>
          <div class="subtasks-list">
            <div
              *ngFor="let subtask of selectedGroup?.subtasks"
              class="subtask-item"
              [class.completed]="subtask.status === 'completed'"
              [class.critical]="subtask.isCritical">

              <div class="subtask-header">
                <div class="subtask-name">{{subtask.task || subtask.name}}</div>
                <div class="subtask-status">{{subtask.status || 'pending'}}</div>
              </div>

              <div class="subtask-details">
                <span class="duration">{{subtask.days || getDuration(subtask)}} days</span>
                <span class="dates">
                  {{formatDate(getSafeDate(subtask.start, subtask.startDate), 'MMM d')}} -
                  {{formatDate(getSafeDate(subtask.end, subtask.endDate), 'MMM d')}}
                </span>
              </div>

              <div class="subtask-progress" *ngIf="subtask.progress !== undefined">
                <div class="progress-bar-small">
                  <div class="progress-fill-small" [style.width.%]="subtask.progress || 0"></div>
                </div>
                <span>{{subtask.progress}}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" (click)="closeGroupModal()">Close</button>
          <button class="btn btn-primary" (click)="editGroup(selectedGroup!)">Edit Tasks</button>
        </div>
      </div>
    </ng-template>
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
      overflow-x: auto;
    }

    .week-cell {
      min-width: 140px;
      border-right: 1px solid #d9d9d9;
    }

    .week-cell.current-week {
      background-color: rgba(251, 208, 8, 0.3);
    }

    .week-label {
      padding: 0.5rem;
      font-weight: 600;
      color: #000;
      text-align: center;
      border-bottom: 1px solid rgba(217, 217, 217, 0.5);
    }

    .week-days {
      display: flex;
    }

    .day-cell {
      flex: 1;
      padding: 0.25rem;
      text-align: center;
      font-size: 0.75rem;
      color: #000;
      border-right: 1px solid rgba(217, 217, 217, 0.3);
    }

    .day-cell.weekend {
      background-color: rgba(0, 0, 0, 0.05);
    }

    .day-cell.today {
      background-color: #fbd008;
      font-weight: bold;
    }

    .timeline-grid {
      position: relative;
      overflow: auto;
      background-color: #fff;
    }

    .grid-background {
      display: flex;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 100%;
    }

    .week-grid {
      min-width: 140px;
      border-right: 1px solid rgba(217, 217, 217, 0.3);
      display: flex;
    }

    .week-grid.current-week-bg {
      background-color: rgba(251, 208, 8, 0.05);
    }

    .day-grid {
      flex: 1;
      border-right: 1px solid rgba(217, 217, 217, 0.2);
      height: 100%;
    }

    .day-grid.weekend-bg {
      background-color: rgba(0, 0, 0, 0.02);
    }

    .day-grid.today-bg {
      background-color: rgba(251, 208, 8, 0.1);
    }

    .task-group-bar {
      position: absolute;
      height: 48px;
      background-color: #61a0af;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid #4a8a98;
      overflow: hidden;
      z-index: 3;
      margin: 4px 0;
    }

    .task-group-bar:hover {
      background-color: #fbd008;
      border-color: #e6bd00;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }

    .task-group-bar.critical {
      border: 2px solid #ef4444;
      border-left: 4px solid #ef4444;
    }

    .task-group-bar.dragging {
      opacity: 0.7;
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
      z-index: 10;
      transform: rotate(2deg);
    }

    .task-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 0.75rem;
      height: 100%;
      color: white;
      position: relative;
      z-index: 2;
    }

    .task-name {
      font-weight: 600;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .task-duration {
      font-size: 0.75rem;
      opacity: 0.9;
      line-height: 1;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .task-count {
      font-size: 0.65rem;
      opacity: 0.8;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .progress-bar {
      position: absolute;
      bottom: 2px;
      left: 2px;
      right: 2px;
      height: 4px;
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }

    .progress-fill {
      height: 100%;
      background-color: rgba(255, 255, 255, 0.9);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .today-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: #fbd008;
      z-index: 5;
      box-shadow: 0 0 4px rgba(251, 208, 8, 0.5);
    }

    /* Modal Styles */
    .group-modal {
      background: white;
      border-radius: 8px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      max-width: 600px;
      width: 90vw;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      background-color: #f9fafb;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #6b7280;
      padding: 0.25rem;
      border-radius: 4px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background-color: #f3f4f6;
      color: #374151;
    }

    .modal-content {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .group-info {
      background-color: #f8fafc;
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1.5rem;
      border: 1px solid #e2e8f0;
    }

    .info-item {
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .info-item:last-child {
      margin-bottom: 0;
    }

    .status-on-track { color: #059669; font-weight: 500; }
    .status-behind { color: #dc2626; font-weight: 500; }
    .status-ahead { color: #2563eb; font-weight: 500; }

    .modal-content h3 {
      margin: 0 0 1rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
    }

    .subtasks-list {
      space-y: 0.75rem;
    }

    .subtask-item {
      background-color: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 0.75rem;
      transition: all 0.2s ease;
    }

    .subtask-item:hover {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      border-color: #d1d5db;
    }

    .subtask-item.completed {
      background-color: #f0fdf4;
      border-color: #bbf7d0;
    }

    .subtask-item.critical {
      border-left: 4px solid #ef4444;
    }

    .subtask-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .subtask-name {
      font-weight: 500;
      color: #111827;
    }

    .subtask-status {
      background-color: #f3f4f6;
      color: #374151;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: capitalize;
    }

    .subtask-details {
      display: flex;
      gap: 1rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .subtask-progress {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .progress-bar-small {
      flex: 1;
      height: 6px;
      background-color: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill-small {
      height: 100%;
      background-color: #059669;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      background-color: #f9fafb;
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn-secondary {
      background-color: #f9fafb;
      color: #374151;
      border-color: #d1d5db;
    }

    .btn-secondary:hover {
      background-color: #f3f4f6;
      border-color: #9ca3af;
    }

    .btn-primary {
      background-color: #fbd008;
      color: #000;
    }

    .btn-primary:hover {
      background-color: #e6bd00;
    }
  `]
})
export class TimelineComponent implements OnInit, OnDestroy {
  @Input() taskGroups: TimelineGroup[] = [];
  @Output() onGroupClick = new EventEmitter<TimelineGroup>();
  @Output() onGroupMove = new EventEmitter<{groupId: string, newStartDate: Date, newEndDate: Date}>();
  @Output() onEditGroup = new EventEmitter<TimelineGroup>();

  @ViewChild('timelineRef', { static: false }) timelineRef!: ElementRef<HTMLDivElement>;
  @ViewChild('groupDetailModal', { static: true }) groupDetailModal!: TemplateRef<any>;

  viewStartDate: Date = new Date();
  draggingGroup: string | null = null;
  dragStartX: number = 0;
  dragStartDate: Date | null = null;
  weeklyDates: { start: Date; days: Date[] }[] = [];
  timelineHeight: number = 400;
  selectedGroup: TimelineGroup | null = null;
  modalRef: MatDialogRef<any> | null = null;

  private weeksToShow: number = 12;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseUpListener?: (e: MouseEvent) => void;

  constructor(private dialog: MatDialog) {}

  ngOnInit() {
    this.initializeViewStartDate();
    this.generateWeeklyDates();
    this.calculateTimelineHeight();
    this.setupGlobalListeners();
  }

  ngOnDestroy() {
    this.cleanupGlobalListeners();
    if (this.modalRef) {
      this.modalRef.close();
    }
  }

  private initializeViewStartDate() {
    if (this.taskGroups.length === 0) {
      this.viewStartDate = new Date();
      return;
    }

    const earliestDate = new Date(
      Math.min(...this.taskGroups.map(g => g.startDate?.getTime() || Date.now()))
    );

    // Set view start date to beginning of week, 2 weeks before earliest task
    const newStartDate = new Date(earliestDate);
    newStartDate.setDate(newStartDate.getDate() - 14);
    newStartDate.setDate(newStartDate.getDate() - newStartDate.getDay()); // Start of week
    this.viewStartDate = newStartDate;
  }

  private calculateTimelineHeight() {
    this.timelineHeight = Math.max(200, this.taskGroups.length * 60 + 40);
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

  private generateWeeklyDates() {
    this.weeklyDates = [];

    for (let week = 0; week < this.weeksToShow; week++) {
      const weekStart = new Date(this.viewStartDate);
      weekStart.setDate(weekStart.getDate() + (week * 7));

      const days: Date[] = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + day);
        days.push(date);
      }

      this.weeklyDates.push({
        start: weekStart,
        days: days
      });
    }
  }

  navigateTimeline(days: number) {
    const newDate = new Date(this.viewStartDate);
    newDate.setDate(newDate.getDate() + days);
    this.viewStartDate = newDate;
    this.generateWeeklyDates();
  }

  openGroupModal(group: TimelineGroup) {
    this.selectedGroup = group;
    this.modalRef = this.dialog.open(this.groupDetailModal, {
      width: '600px',
      maxHeight: '80vh',
      disableClose: false,
      data: { group }
    });
  }

  closeGroupModal() {
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
    this.selectedGroup = null;
  }

  editGroup(group: TimelineGroup) {
    this.onEditGroup.emit(group);
    this.closeGroupModal();
  }

  handleDragStart(e: MouseEvent, groupTitle: string) {
    e.preventDefault();
    e.stopPropagation();
    this.draggingGroup = groupTitle;
    this.dragStartX = e.clientX;

    const group = this.taskGroups.find(g => g.title === groupTitle);
    if (group && group.startDate) {
      this.dragStartDate = new Date(group.startDate);
    }
  }

  handleDragOver(e: MouseEvent) {
    e.preventDefault();
    if (!this.draggingGroup || !this.dragStartDate || !this.timelineRef?.nativeElement) return;

    // Visual feedback during drag could be added here
    const dragDelta = e.clientX - this.dragStartX;
    const groupEl = document.querySelector(`[data-group="${this.draggingGroup}"]`) as HTMLElement;
    if (groupEl) {
      groupEl.style.transform = `translateX(${dragDelta}px)`;
    }
  }

  handleDragEnd(e: MouseEvent) {
    if (!this.draggingGroup || !this.dragStartDate || !this.timelineRef?.nativeElement) {
      this.resetDrag();
      return;
    }

    const rect = this.timelineRef.nativeElement.getBoundingClientRect();
    const timelineWidth = rect.width;
    const totalDays = this.weeksToShow * 7;
    const dayWidth = timelineWidth / totalDays;
    const dragDelta = e.clientX - this.dragStartX;
    const daysDelta = Math.round(dragDelta / dayWidth);

    const group = this.taskGroups.find(g => g.title === this.draggingGroup);
    if (group && group.startDate && group.endDate && daysDelta !== 0) {
      const groupDuration = differenceInCalendarDays(group.endDate, group.startDate);

      const newStartDate = addDays(this.dragStartDate, daysDelta);
      const newEndDate = addDays(newStartDate, groupDuration);

      this.onGroupMove.emit({
        groupId: group.title,
        newStartDate,
        newEndDate
      });
    }

    this.resetDrag();
  }

  private resetDrag() {
    if (this.draggingGroup) {
      const groupEl = document.querySelector(`[data-group="${this.draggingGroup}"]`) as HTMLElement;
      if (groupEl) {
        groupEl.style.transform = '';
      }
    }

    this.draggingGroup = null;
    this.dragStartDate = null;
  }

  getGroupStyle(group: TimelineGroup, index: number): any {
    if (!group.startDate || !group.endDate) return {};

    const totalDays = this.weeksToShow * 7;
    const startDiff = differenceInCalendarDays(group.startDate, this.viewStartDate);
    const duration = differenceInCalendarDays(group.endDate, group.startDate) + 1;

    const left = `${(startDiff / totalDays) * 100}%`;
    const width = `${Math.min((duration / totalDays) * 100, 95)}%`;
   const top = `${index * 60 + 10}px`;

   return {
     left,
     width,
     top
   };
 }

 getGroupTooltip(group: TimelineGroup): string {
   const duration = group.startDate && group.endDate ?
     differenceInCalendarDays(group.endDate, group.startDate) + 1 : 0;
   return `${group.title}\n${group.subtasks.length} subtasks\n${duration} days\nProgress: ${group.progress || 0}%`;
 }

 isGroupCritical(group: TimelineGroup): boolean {
   return group.subtasks.some(task => task.isCritical);
 }

 getTodayPosition(): string {
   const totalDays = this.weeksToShow * 7;
   const daysSinceStart = differenceInCalendarDays(new Date(), this.viewStartDate);
   const position = (daysSinceStart / totalDays) * 100;
   return `${Math.max(0, Math.min(position, 100))}%`;
 }

 getEndDate(): Date {
   const endDate = new Date(this.viewStartDate);
   endDate.setDate(endDate.getDate() + (this.weeksToShow * 7) - 1);
   return endDate;
 }

 isCurrentWeek(weekStart: Date): boolean {
   const today = new Date();
   const weekEnd = new Date(weekStart);
   weekEnd.setDate(weekEnd.getDate() + 6);
   return today >= weekStart && today <= weekEnd;
 }

 isWeekend(date: Date): boolean {
   return date.getDay() === 0 || date.getDay() === 6;
 }

 isToday(date: Date): boolean {
   const today = new Date();
   return date.toDateString() === today.toDateString();
 }

 formatDate(date: Date, formatStr: string): string {
   return format(date, formatStr);
 }

 getDuration(task: TimelineTask): number {
   if (!task.start || !task.end) return 0;
   return differenceInCalendarDays(task.end, task.start) + 1;
 }

 public getSafeDate(date: Date | undefined, dateString: string | undefined): Date {
    if (date) {
      return date;
    }
    if (dateString) {
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    return new Date(); // Return today's date as a fallback
  }
}
