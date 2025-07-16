import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, OnDestroy, TemplateRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { format, addDays, differenceInCalendarDays, isValid, parse } from 'date-fns';

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
  hasWeatherWarning?: boolean;
  weatherWarningMessage?: string;
  weatherIconUrl?: string;
}

export interface TimelineGroup {
  title: string;
  subtasks: TimelineTask[];
  startDate?: Date;
  endDate?: Date;
  progress?: number;
  scheduleStatus?: 'on-track' | 'behind' | 'ahead';
  hasWeatherWarning?: boolean;
  weatherWarningMessage?: string;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, OnDestroy, OnChanges {
  @Input() taskGroups: TimelineGroup[] = [];
  @Input() isProjectOwner: boolean = false;
  @Output() onGroupClick = new EventEmitter<TimelineGroup>();
  @Output() onGroupMove = new EventEmitter<{groupId: string, newStartDate: Date, newEndDate: Date}>();
  @Output() onEditGroup = new EventEmitter<TimelineGroup>();

  @ViewChild('timelineRef', { static: false }) timelineRef!: ElementRef<HTMLDivElement>;
  @ViewChild('headerRef', { static: false }) headerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('groupDetailModal', { static: true }) groupDetailModal!: TemplateRef<any>;

  viewStartDate: Date = new Date();
  draggingGroup: string | null = null;
  dragStartDate: Date | null = null;
  isDragging: boolean = false;
  dragStartPos: { x: number, y: number } | null = null;
  weeklyDates: { start: Date; days: Date[] }[] = [];
  timelineHeight: number = 400;
  selectedGroup: TimelineGroup | null = null;
  modalRef: MatDialogRef<any> | null = null;
  endDate: Date = new Date();
  private ghostElement: HTMLElement | null = null;
  private navigationInterval: any;

  private weeksToShow: number = 12;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseUpListener?: (e: MouseEvent) => void;

  constructor(private dialog: MatDialog) {}

  ngOnInit() {
    this.processTaskGroups();
    this.initializeViewStartDate();
    this.generateWeeklyDates();
    this.calculateTimelineHeight();
    this.setupGlobalListeners();
    this.getEndDate();
  }

  ngOnDestroy() {
    this.cleanupGlobalListeners();
    if (this.modalRef) {
      this.modalRef.close();
    }
  }

   ngOnChanges(changes: SimpleChanges) {
     if (changes['taskGroups']) {
       this.processTaskGroups();
       this.initializeViewStartDate();
       this.generateWeeklyDates();
       this.calculateTimelineHeight();
     }
   }

   private processTaskGroups(): void {
    if (!this.taskGroups) {
      return;
    }
    this.taskGroups.forEach(group => {
      if (group.subtasks && group.subtasks.length > 0) {
        const totalProgress = group.subtasks.reduce((acc, subtask) => acc + (subtask.progress || 0), 0);
        group.progress = Math.round(totalProgress / group.subtasks.length);
      } else {
        group.progress = 0;
      }
    });
  }

   private initializeViewStartDate() {
     if (!this.taskGroups || this.taskGroups.length === 0) {
       this.viewStartDate = new Date();
       this.viewStartDate.setDate(this.viewStartDate.getDate() - this.viewStartDate.getDay());
       return;
     }

     let allTimestamps: number[] = this.taskGroups
       .flatMap(g => g.subtasks)
       .map(t => {
         if (t.start) {
           return t.start.getTime();
         }
         if (t.startDate) {
           const d = new Date(t.startDate);
           return isNaN(d.getTime()) ? undefined : d.getTime();
         }
         return undefined;
       })
       .filter((t): t is number => t !== undefined);

     if (allTimestamps.length === 0) {
       // Fallback to group start dates
       allTimestamps = this.taskGroups
         .map(g => {
           return g.startDate?.getTime();
         })
         .filter((t): t is number => t !== undefined && !isNaN(t));
     }

     if (allTimestamps.length === 0) {
       this.viewStartDate = new Date();
       this.viewStartDate.setDate(this.viewStartDate.getDate() - this.viewStartDate.getDay());
       return;
     }

     const earliestTimestamp = Math.min(...allTimestamps);
     const earliestDate = new Date(earliestTimestamp);

     // Set view start date to beginning of the week of the earliest task
     const newStartDate = new Date(earliestDate);
     newStartDate.setDate(newStartDate.getDate() - newStartDate.getDay()); // Start of week (Sunday)
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
    console.log('[Timeline] generateWeeklyDates called');
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
    console.log(`[Timeline] navigateTimeline called with days: ${days}`);
    console.log(`[Timeline] Current viewStartDate:`, this.viewStartDate);
    const newDate = new Date(this.viewStartDate);
    newDate.setDate(newDate.getDate() + days);
    this.viewStartDate = newDate;
    console.log(`[Timeline] New viewStartDate:`, this.viewStartDate);
    this.generateWeeklyDates();
    this.getEndDate();
  }

  startTimelineNavigation(direction: number) {
    console.log(`[Timeline] startTimelineNavigation called with direction: ${direction}`);
    this.navigateTimeline(direction); // Initial call
    this.navigationInterval = setInterval(() => {
      this.navigateTimeline(direction);
    }, 100);
  }

  stopTimelineNavigation() {
    console.log('[Timeline] stopTimelineNavigation called');
    clearInterval(this.navigationInterval);
  }

  public onGridScroll(): void {
    if (this.headerRef?.nativeElement && this.timelineRef?.nativeElement) {
      this.headerRef.nativeElement.scrollLeft = this.timelineRef.nativeElement.scrollLeft;
    }
  }

  public getScheduleStatus(group: TimelineGroup): 'on-track' | 'behind' | 'ahead' {
    if (!group.startDate || !group.endDate) {
      return 'on-track';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groupStartDate = new Date(group.startDate);
    groupStartDate.setHours(0, 0, 0, 0);

    const groupEndDate = new Date(group.endDate);
    groupEndDate.setHours(0, 0, 0, 0);

    const progress = group.progress || 0;

    if (progress === 100) {
      return 'on-track';
    }

    if (today > groupEndDate && progress < 100) {
      return 'behind';
    }

    if (today < groupStartDate) {
      return 'on-track';
    }

    const totalDuration = differenceInCalendarDays(groupEndDate, groupStartDate);
    const elapsedDuration = differenceInCalendarDays(today, groupStartDate);

    if (totalDuration <= 0) {
      return today > groupEndDate ? 'behind' : 'on-track';
    }

    const expectedProgress = Math.min(100, (elapsedDuration / totalDuration) * 100);

    if (progress < expectedProgress) {
      return 'behind';
    }

    return 'on-track';
  }

  openGroupModal(group: TimelineGroup) {
    this.selectedGroup = {
      ...group,
      scheduleStatus: this.getScheduleStatus(group)
    };
    this.modalRef = this.dialog.open(this.groupDetailModal, {
      width: '600px',
      maxHeight: '80vh',
      disableClose: false,
      data: { group: this.selectedGroup }
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

  handleDragStart(e: MouseEvent, group: TimelineGroup) {
    if (!this.isProjectOwner) {
      this.openGroupModal(group);
      return;
    }
    // Prevent drag for right-click
    if (e.button === 2) {
      return;
    }

    this.dragStartPos = { x: e.clientX, y: e.clientY };
    this.draggingGroup = group.title;

    if (group && group.startDate) {
      this.dragStartDate = new Date(group.startDate);
    }

    // Don't create ghost element immediately, wait for drag threshold
  }

  handleDragOver(e: MouseEvent) {
    if (!this.dragStartPos || !this.draggingGroup) {
      return;
    }

    const dx = e.clientX - this.dragStartPos.x;
    const dy = e.clientY - this.dragStartPos.y;

    if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) > 5) {
      this.isDragging = true;
      this.createGhostElement();
    }

    if (this.isDragging) {
      e.preventDefault();
      this.updateGhostPosition(e.clientX);
    }
  }

  handleDragEnd(e: MouseEvent) {
    const group = this.taskGroups.find(g => g.title === this.draggingGroup);

    if (this.isDragging) {
      if (!this.draggingGroup || !this.dragStartDate || !this.timelineRef?.nativeElement || !this.dragStartPos) {
        this.resetDrag();
        return;
      }

      const rect = this.timelineRef.nativeElement.getBoundingClientRect();
      const timelineWidth = rect.width;
      const totalDays = this.weeksToShow * 7;
      const dayWidth = timelineWidth / totalDays;
      const dragDelta = e.clientX - this.dragStartPos.x;
      const daysDelta = Math.round(dragDelta / dayWidth);

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
    } else if (group) {
      // This is a click, not a drag
      this.openGroupModal(group);
    }

    this.resetDrag();
  }

  private createGhostElement() {
    if (!this.draggingGroup || !this.timelineRef) return;

    const originalEl = this.timelineRef.nativeElement.querySelector(`[data-group="${this.draggingGroup}"]`) as HTMLElement;
    if (!originalEl) return;

    this.ghostElement = originalEl.cloneNode(true) as HTMLElement;
    this.ghostElement.classList.add('group-ghost');

    const rect = originalEl.getBoundingClientRect();
    this.ghostElement.style.width = `${rect.width}px`;
    this.ghostElement.style.height = `${rect.height}px`;
    this.ghostElement.style.top = `${rect.top}px`;
    this.ghostElement.style.left = `${rect.left}px`;

    document.body.appendChild(this.ghostElement);
    originalEl.classList.add('dragging-source');
  }

  private updateGhostPosition(currentX: number) {
    if (!this.ghostElement || !this.dragStartPos) return;

    const dragDelta = currentX - this.dragStartPos.x;
    this.ghostElement.style.transform = `translateX(${dragDelta}px)`;
  }

  private resetDrag() {
    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }

    if (this.draggingGroup) {
      const originalEl = document.querySelector(`[data-group="${this.draggingGroup}"]`) as HTMLElement;
      if (originalEl) {
        originalEl.classList.remove('dragging-source');
        originalEl.style.transform = '';
      }
    }

    this.draggingGroup = null;
    this.dragStartDate = null;
    this.isDragging = false;
    this.dragStartPos = null;
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

formatDate(date: Date | string | null | undefined, formatStr: string): string {
  if (!date) return '';

  const parsedDate = this.parseMultipleFormats(date);
  return parsedDate ? format(parsedDate, formatStr) : '';
}

private parseMultipleFormats(dateInput: Date | string | null | undefined): Date | null {
  if (!dateInput) return null;

  if (dateInput instanceof Date) {
    return isValid(dateInput) ? dateInput : null;
  }

  if (typeof dateInput !== 'string') return null;

  const dateStr = dateInput.trim();
  if (!dateStr) return null;

  // Define the formats to try in order of preference
  const formats = [
    'dd/MM/yyyy',    // 20/12/2025
    'dd-MM-yyyy',    // 20-12-2025
    'MM/dd/yyyy',    // 12/20/2025
    'MM-dd-yyyy',    // 12-20-2025
    'yyyy-MM-dd',    // 2025-12-20
    'yyyy/MM/dd',    // 2025/12/20
    'dd/MM/yy',      // 20/12/25
    'dd-MM-yy',      // 20-12-25
    'MM/dd/yy',      // 12/20/25
    'MM-dd-yy'       // 12-20-25
  ];

  for (const formatPattern of formats) {
    try {
      const parsedDate = parse(dateStr, formatPattern, new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    } catch (e) {
      // Continue to next format
    }
  }

  // Fallback to native Date parsing
  try {
    const nativeDate = new Date(dateStr);
    if (isValid(nativeDate)) {
      return nativeDate;
    }
  } catch (e) {
    // Ignore
  }

  return null;
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

  public getGroupStatus(group: TimelineGroup): string {
    if (!group.subtasks || group.subtasks.length === 0) {
      return 'pending';
    }

    if (group.subtasks.some(t => t.status === 'delayed')) {
      return 'delayed';
    }

    if (group.subtasks.every(t => t.status === 'completed')) {
      return 'completed';
    }

    if (group.subtasks.every(t => t.status === 'pending')) {
      return 'pending';
    }

    return 'in_progress';
  }
}
