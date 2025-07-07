import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, OnDestroy, TemplateRef, OnChanges, SimpleChanges } from '@angular/core';
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
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, OnDestroy, OnChanges {
  @Input() taskGroups: TimelineGroup[] = [];
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
  private ghostElement: HTMLElement | null = null;
  private navigationInterval: any;

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

   ngOnChanges(changes: SimpleChanges) {
     if (changes['taskGroups']) {
       this.initializeViewStartDate();
       this.generateWeeklyDates();
       this.calculateTimelineHeight();
     }
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

  startTimelineNavigation(direction: number) {
    this.navigateTimeline(direction); // Initial call
    this.navigationInterval = setInterval(() => {
      this.navigateTimeline(direction);
    }, 100);
  }

  stopTimelineNavigation() {
    clearInterval(this.navigationInterval);
  }

  public onGridScroll(): void {
    if (this.headerRef?.nativeElement && this.timelineRef?.nativeElement) {
      this.headerRef.nativeElement.scrollLeft = this.timelineRef.nativeElement.scrollLeft;
    }
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

  handleDragStart(e: MouseEvent, group: TimelineGroup) {
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
